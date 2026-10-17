"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Vector3, type Group, type Object3D } from "three";
import { preloadProps, PROP_HEIGHT, usePropMesh, type PropId } from "./props";
import { findBone } from "./worldPlacement";

/** A pair of wings worn on the back: how they look and beat. */
interface WingsLook {
  prop: PropId;
  /** How tall the pair stands, in model units (Meshy figures stand 1.7). */
  height: number;
  /** Where their root sits from the upper spine, in the figure's frame (+y up, +z ahead): on the back. */
  root: [number, number, number];
  /** How far out from the spine each wing turns (model units): on the shoulder blade, so its inner edge stays clear of the shoulder. */
  hinge: number;
  /** Each wing swept back from flat (radians), at rest. */
  sweep: number;
  /**
   * A full beat (stroke ±1, see Wings): how far the tips swing back and forth (radians about the
   * spine) and rise and fall (radians about the root, the tips going up and down).
   */
  swing: number;
  lift: number;
  /** Where a wing's tip is, in the prop's units (see PROP_HEIGHT): out from the spine, and up. */
  tip: [number, number];
  /** Beating on their own: how much of a full beat (0 to 1), and how fast (radians a second). */
  idle: number;
  beatRate: number;
  /** See-through ice, glowing a little (the fairy's); otherwise as modelled. */
  icy: boolean;
}

const WINGS = {
  // The Crystal Fairy's: shoulders to thighs, quick and light, of translucent ice.
  fairy: {
    prop: "fairyWings",
    height: 0.95,
    root: [0, 0.02, -0.11],
    hinge: 0.03,
    sweep: 0.45,
    swing: 0.3,
    lift: 0.2,
    tip: [0.75, 0.9],
    idle: 1,
    beatRate: 4.2,
    icy: true,
  },
  // Seraphiel's feathered wings, and his burnt ones once fallen: tips above his head, great slow
  // beats at rest, and mighty ones when driven (his entrance).
  seraph: {
    prop: "seraphWings",
    height: 1.6,
    root: [0, 0.12, -0.2],
    hinge: 0.09,
    sweep: 0.4,
    swing: 0.2,
    lift: 0.3,
    tip: [0.72, 0.9],
    idle: 0.4,
    beatRate: 1.8,
    icy: false,
  },
  fallen: {
    prop: "fallenWings",
    height: 1.6,
    root: [0, 0.12, -0.2],
    hinge: 0.09,
    sweep: 0.4,
    swing: 0.2,
    lift: 0.28,
    tip: [0.72, 0.9],
    idle: 0.35,
    beatRate: 1.4,
    icy: false,
  },
} as const satisfies Record<string, WingsLook>;
export type WingsId = keyof typeof WINGS;

/** How quickly the shown beat follows the wanted one (per second): smooth, yet keeping up with a hard beat. */
const SMOOTHING = 12;
/** How quickly the wings fold away (seated on a throne, they'd go through its back) and open again. */
const FOLD_RATE = 4;

/** A little lean back, so the wings fan out from the shoulder blades instead of standing upright. */
const LEAN = 0.18;

preloadProps(Object.values(WINGS).map(({ prop }) => prop));

/**
 * Wings on a figure's back: a separate model (PROPS.fairyWings, seraphWings…), beating in code.
 * Meshy's rig binds wings to the arms (raising an arm drags the wing's membrane with it), so the
 * figures are made without them. The pair is split down the middle into a left and a right wing,
 * each turning on the spine; they follow the upper spine around but keep upright with the figure.
 * While `folded` is on (seated) they sweep shut behind the back and fold away.
 * Mounted inside the figure (its own frame, in model units).
 */
export function Wings({
  figure,
  wings,
  folded,
  stroke,
  tips,
}: {
  figure: Object3D;
  wings: WingsId;
  folded?: RefObject<boolean>;
  /** Where they are in their beat when driven from outside (an entrance): 1 up and back, -1 down and forward; null beats on their own. */
  stroke?: RefObject<number | null>;
  /** Filled every frame with where the wing tips are, in world space (for what flies off them). */
  tips?: { left: Vector3; right: Vector3 };
}) {
  const look: WingsLook = WINGS[wings];
  const spine = useMemo(() => findBone(figure, "Spine2"), [figure]);
  const { geometry, material } = usePropMesh(look.prop);
  const halves = useMemo(() => splitDownTheMiddle(geometry), [geometry]);
  const worn = useMemo(() => {
    const copy = material.clone();
    copy.side = DoubleSide;
    if (look.icy) {
      copy.transparent = true;
      copy.opacity = 0.85;
      copy.depthWrite = false;
      copy.emissive = new Color("#9be7ff");
      copy.emissiveMap = copy.map;
      copy.emissiveIntensity = 0.35;
    }
    return copy;
  }, [material, look.icy]);
  useEffect(
    () => () => {
      halves.left.dispose();
      halves.right.dispose();
      worn.dispose();
    },
    [halves, worn],
  );

  const root = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const scratch = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(...look.root), [look.root]);
  /** 0 spread, 1 folded away. */
  const fold = useRef(0);
  /** The beat as shown, eased towards where it should be, so nothing ever jumps (an entrance handing over to the idle beat). */
  const shown = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!root.current || !spine) return;
    fold.current += ((folded?.current ? 1 : 0) - fold.current) * (1 - Math.exp(-FOLD_RATE * delta));
    root.current.visible = fold.current < 0.98;
    root.current.scale.setScalar(Math.max(0.001, 1 - fold.current));
    root.current.position.copy(figure.worldToLocal(spine.getWorldPosition(scratch))).add(offset);
    // Tips swing back (-z) and forward again: the right wing turns one way about the spine, the left
    // the other; folding, they sweep shut behind the back.
    const driven = stroke?.current ?? null;
    const wanted = (driven ?? Math.sin(clock.elapsedTime * look.beatRate) * look.idle) * (1 - fold.current);
    shown.current += (wanted - shown.current) * (1 - Math.exp(-SMOOTHING * delta));
    const beat = shown.current;
    // Raised (tips up) and swept back on the upstroke, beaten down and forward on the downstroke.
    const sweep = look.sweep + beat * look.swing + fold.current * (Math.PI / 2 - look.sweep);
    const lift = beat * look.lift;
    right.current?.rotation.set(0, sweep, lift);
    left.current?.rotation.set(0, -sweep, -lift);
    if (tips && right.current && left.current) {
      const unit = look.height / PROP_HEIGHT;
      right.current.updateWorldMatrix(true, false);
      left.current.updateWorldMatrix(true, false);
      right.current.localToWorld(tips.right.set(look.tip[0] * unit - look.hinge, look.tip[1] * unit, 0));
      left.current.localToWorld(tips.left.set(-look.tip[0] * unit + look.hinge, look.tip[1] * unit, 0));
    }
  });

  if (!spine) return null;
  const scale = look.height / PROP_HEIGHT;
  return (
    <group ref={root} rotation-x={-LEAN}>
      {/* Each turning on its own shoulder blade. */}
      <group ref={left} position-x={-look.hinge}>
        <mesh geometry={halves.left} material={worn} scale={scale} position-x={look.hinge} renderOrder={1} />
      </group>
      <group ref={right} position-x={look.hinge}>
        <mesh geometry={halves.right} material={worn} scale={scale} position-x={-look.hinge} renderOrder={1} />
      </group>
    </group>
  );
}

/** The pair as two geometries: the triangles left of the middle (x < 0), and those right of it. */
function splitDownTheMiddle(geometry: BufferGeometry): { left: BufferGeometry; right: BufferGeometry } {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const sides = { left: new Map<string, number[]>(), right: new Map<string, number[]>() };
  const names = Object.keys(source.attributes);
  for (const name of names) {
    sides.left.set(name, []);
    sides.right.set(name, []);
  }
  const position = source.getAttribute("position");
  for (let first = 0; first < position.count; first += 3) {
    const middle = position.getX(first) + position.getX(first + 1) + position.getX(first + 2);
    const side = middle < 0 ? sides.left : sides.right;
    for (const name of names) {
      const attribute = source.getAttribute(name);
      const values = side.get(name)!;
      for (let vertex = first; vertex < first + 3; vertex++) {
        for (let component = 0; component < attribute.itemSize; component++) {
          values.push(attribute.getComponent(vertex, component));
        }
      }
    }
  }
  const build = (side: Map<string, number[]>) => {
    const half = new BufferGeometry();
    for (const name of names) {
      half.setAttribute(name, new Float32BufferAttribute(side.get(name)!, source.getAttribute(name).itemSize));
    }
    return half;
  };
  const halves = { left: build(sides.left), right: build(sides.right) };
  if (source !== geometry) source.dispose();
  return halves;
}
