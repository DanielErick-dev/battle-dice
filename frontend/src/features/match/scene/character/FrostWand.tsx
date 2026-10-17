"use client";

import { Sparkles } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D as Dummy,
  Vector3,
  type Group,
  type InstancedMesh,
  type Object3D,
} from "three";
import { useAge } from "../useAge";
import { preloadProps, Prop, usePropMesh } from "./props";
import { findBone } from "./worldPlacement";

/** The wand's length, in model units (Meshy figures stand 1.7), and how much of it is below the grip. */
const WAND_LENGTH = 0.95;
const GRIP = 0.18;
/** Where the grip sits from the wrist, in the hand bone's own frame (Mixamo: +y runs along the fingers). */
const HOLD_OFFSET = new Vector3(0, 0.06, 0.02);
/** How quickly the wand appears in the hand, and fades once put away. */
const GROW_RATE = 8;
const FADE_RATE = 4;
/** The frosty glow round its snowflake head, past 1.0 so it blooms; and the snow glittering off it. */
const TIP_GLOW = new Color("#bdf3ff").multiplyScalar(2.2);
const TIP_SNOW = "#eafaff";
/** Her flourish: snowflakes spiralling up off the wand, how far out, how high, and how fast they turn. */
const SWIRL_FLAKES = 40;
const SWIRL_RADIUS = 0.15;
const SWIRL_HEIGHT = 0.5;
const SWIRL_TURN_RATE = 2.6;
/** How quickly the flourish swells, and dies down. */
const FLOURISH_RATE = 3;
const DUST = new Color("#7fe3ff").multiplyScalar(2.6);

preloadProps(["frostWand"]);

interface FrostWandProps {
  figure: Object3D;
  active: RefObject<boolean>;
  /** Filled every frame with where the wand's snowflake head is, in world space (for snow it casts). */
  tip?: Vector3;
  /** The hand holding it (her right by default). */
  hand?: "LeftHand" | "RightHand";
  /**
   * A flourish of snow and fairy dust pouring off it, big, from `from` to `to` seconds after it's
   * mounted (her intro, see CharacterDefinition.introWand).
   */
  flourish?: { from: number; to: number };
}

/**
 * The Crystal Fairy's frost wand (a snowflake crowning an icy shaft), held in her right hand while
 * `active` is on. Bound to the hand bone and pointing the way her fingers do, so reaching forward
 * aims it ahead. Meshy figures can't hold props, so it's a separate model (PROPS.frostWand).
 */
export function FrostWand(props: FrostWandProps) {
  const hand = useMemo(() => findBone(props.figure, props.hand ?? "RightHand"), [props.figure, props.hand]);
  return hand ? createPortal(<Held {...props} hand={hand} />, hand) : null;
}

function Held({ figure, hand, active, tip, flourish }: Omit<FrostWandProps, "hand"> & { hand: Object3D }) {
  const { geometry, material } = usePropMesh("frostWand");
  const group = useRef<Group>(null);
  const strength = useRef(0);
  const scratch = useMemo(() => ({ handScale: new Vector3(), figureScale: new Vector3() }), []);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const target = active.current ? 1 : 0;
    const rate = target > strength.current ? GROW_RATE : FADE_RATE;
    strength.current += (target - strength.current) * (1 - Math.exp(-rate * delta));
    node.visible = strength.current > 0.01;
    if (!node.visible) return;

    hand.getWorldScale(scratch.handScale);
    figure.getWorldScale(scratch.figureScale);
    // In the hand's frame: model units, undoing any scale the bone itself carries.
    const unit = scratch.figureScale.x / scratch.handScale.x;
    node.position.copy(HOLD_OFFSET).multiplyScalar(unit);
    node.scale.setScalar(strength.current * unit);
    if (tip) {
      node.updateWorldMatrix(true, false);
      node.localToWorld(tip.set(0, WAND_LENGTH * (1 - GRIP), 0));
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* Gripped low on the shaft, the snowflake head out past the fingers. */}
      <group position-y={WAND_LENGTH * (0.5 - GRIP)}>
        <Prop geometry={geometry} material={material} height={WAND_LENGTH} />
      </group>
      {/* Its head glows, and snow glitters off it. */}
      <group position-y={WAND_LENGTH * (1 - GRIP) * 0.9}>
        <mesh>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial
            color={TIP_GLOW}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <Sparkles count={26} scale={0.32} size={3.5} speed={0.7} noise={0.6} color={TIP_SNOW} opacity={0.95} />
        {flourish && <Flourish {...flourish} />}
      </group>
    </group>
  );
}

/**
 * Snow and fairy dust pouring off the wand's head between `from` and `to` seconds: a cloud of
 * glittering dust, falling snow, a bright halo, and snowflakes spiralling up round the wand.
 */
function Flourish({ from, to }: { from: number; to: number }) {
  const root = useRef<Group>(null);
  const swirl = useRef<InstancedMesh>(null);
  const strength = useRef(0);
  const age = useAge();
  const flakes = useMemo(() => new IcosahedronGeometry(0.016, 0), []);
  const snow = useMemo(
    () => new MeshBasicMaterial({ color: new Color(TIP_SNOW).multiplyScalar(1.8), toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      flakes.dispose();
      snow.dispose();
    },
    [flakes, snow],
  );
  const dummy = useMemo(() => new Dummy(), []);

  useFrame(({ clock }, delta) => {
    const t = age(clock.elapsedTime);
    const target = t >= from && t < to ? 1 : 0;
    strength.current += (target - strength.current) * (1 - Math.exp(-FLOURISH_RATE * delta));
    const node = root.current;
    if (!node) return;
    node.visible = strength.current > 0.02;
    if (!node.visible) return;
    node.scale.setScalar(strength.current);
    const mesh = swirl.current;
    if (!mesh) return;
    for (let index = 0; index < SWIRL_FLAKES; index++) {
      const phase = index / SWIRL_FLAKES;
      // Each rises from the head and widens as it goes, round and round, then starts again.
      const rise = (phase + t * 0.45) % 1;
      const angle = phase * Math.PI * 2 * 7 + t * SWIRL_TURN_RATE;
      const radius = SWIRL_RADIUS * (0.3 + rise);
      dummy.position.set(Math.cos(angle) * radius, rise * SWIRL_HEIGHT, Math.sin(angle) * radius);
      dummy.rotation.set(angle, t * 3 + index, 0);
      dummy.scale.setScalar(Math.sin(rise * Math.PI) * 1.4);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial
          color={DUST}
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh ref={swirl} args={[flakes, snow, SWIRL_FLAKES]} frustumCulled={false} />
      <Sparkles
        count={70}
        scale={[0.35, 0.6, 0.35]}
        position-y={0.25}
        size={4.5}
        speed={1.2}
        noise={0.4}
        color={DUST}
      />
      <Sparkles count={50} scale={0.4} position-y={0.1} size={3.5} speed={0.7} noise={0.4} color={TIP_SNOW} />
    </group>
  );
}
