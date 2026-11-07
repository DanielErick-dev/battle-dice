"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Color, DoubleSide, Vector3, type Group, type Object3D } from "three";
import { useBone } from "../core/bones";
import { preloadProps, PROP_HEIGHT, usePropMesh } from "../core/props";
import { useDisposable, useDisposables } from "../shared/disposal";
import { approach } from "../shared/easing";
import { splitDownTheMiddle } from "./splitWings";
import { WINGS, type WingsId, type WingsLook } from "./wingLooks";

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
  const spine = useBone(figure, "Spine2");
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
  useDisposables(halves);
  useDisposable(worn);

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
    fold.current = approach(fold.current, folded?.current ? 1 : 0, FOLD_RATE, delta);
    root.current.visible = fold.current < 0.98;
    root.current.scale.setScalar(Math.max(0.001, 1 - fold.current));
    root.current.position.copy(figure.worldToLocal(spine.getWorldPosition(scratch))).add(offset);
    // Tips swing back (-z) and forward again: the right wing turns one way about the spine, the left
    // the other; folding, they sweep shut behind the back.
    const driven = stroke?.current ?? null;
    const wanted = (driven ?? Math.sin(clock.elapsedTime * look.beatRate) * look.idle) * (1 - fold.current);
    shown.current = approach(shown.current, wanted, SMOOTHING, delta);
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
