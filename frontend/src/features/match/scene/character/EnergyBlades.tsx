"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { Fragment, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, BackSide, Color, type Group, type MeshBasicMaterial, type Object3D } from "three";

/** Blade length and where it starts past the wrist, in model units (Meshy figures stand 1.7). */
const BLADE_LENGTH = 0.85;
const BLADE_OFFSET = 0.09;
/** How quickly the blades grow out of the hands, and the slower fade once they're let go. */
const GROW_RATE = 7;
const FADE_RATE = 2;
/** Near-black violet, like the armour: the glow around it gives the blade its edge. */
const BLADE_CORE = "#1c0f2e";

/**
 * Two blades of light held in the figure's hands while `active` is on. Meshy animates only the
 * skeleton, so swords modelled on the hips stay there; these stand in for them in sword moves.
 * Each blade is bound to a hand bone (Mixamo rig) and runs along it, past the fingers.
 */
export function EnergyBlades({
  figure,
  color,
  active,
}: {
  figure: Object3D;
  color: string;
  active: RefObject<boolean>;
}) {
  const hands = useMemo(() => ["RightHand", "LeftHand"].map((name) => findBone(figure, name)), [figure]);
  const strength = useRef(0);
  useFrame((_, delta) => {
    const target = active.current ? 1 : 0;
    const rate = target > strength.current ? GROW_RATE : FADE_RATE;
    strength.current += (target - strength.current) * (1 - Math.exp(-rate * delta));
  });

  return hands.map((hand, index) => (
    <Fragment key={index}>
      {hand && createPortal(<Blade color={color} strength={strength} seed={index * 1.7} />, hand)}
    </Fragment>
  ));
}

/** A dark core inside a flickering glow in the accent, growing out from the hand with `strength`. */
function Blade({ color, strength, seed }: { color: string; strength: RefObject<number>; seed: number }) {
  const group = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const tint = useMemo(() => new Color(color).multiplyScalar(1.3), [color]);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;
    const amount = strength.current;
    node.visible = amount > 0.01;
    node.scale.set(amount, amount, amount);
    const flicker = 0.85 + Math.sin(state.clock.elapsedTime * 23 + seed) * 0.1 + Math.random() * 0.05;
    if (glow.current) glow.current.opacity = 0.5 * flicker;
  });

  return (
    <group ref={group} position-y={BLADE_OFFSET} visible={false}>
      <mesh position-y={BLADE_LENGTH / 2}>
        <cylinderGeometry args={[0.012, 0.022, BLADE_LENGTH, 10]} />
        <meshBasicMaterial color={BLADE_CORE} />
      </mesh>
      <mesh position-y={BLADE_LENGTH / 2}>
        <cylinderGeometry args={[0.024, 0.042, BLADE_LENGTH * 1.04, 14]} />
        <meshBasicMaterial
          ref={glow}
          color={tint}
          // Inner faces only: the dark core hides the middle, so the glow rims its edges.
          side={BackSide}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
function findBone(figure: Object3D, name: string): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}
