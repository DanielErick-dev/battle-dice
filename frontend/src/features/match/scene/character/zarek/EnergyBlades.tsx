"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { BackSide, type Group, type MeshBasicMaterial, type Object3D } from "three";
import { InHand } from "../core/inHand";
import { AdditiveMaterial } from "../shared/additive";
import { growOrFade } from "../shared/easing";
import { useGlowColor } from "../shared/glowColor";

/** Blade length and where it starts past the wrist, in model units (Meshy figures stand 1.7). */
const BLADE_LENGTH = 0.85;
const BLADE_OFFSET = 0.09;
/** How quickly the blades grow out of the hands, and the slower fade once they're let go. */
const GROW_RATE = 7;
const FADE_RATE = 2;
/** Near-black violet, like the armour: the glow around it gives the blade its edge. */
const BLADE_CORE = "#1c0f2e";
const HANDS = ["RightHand", "LeftHand"] as const;

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
  const strength = useRef(0);
  useFrame((_, delta) => {
    strength.current = growOrFade(strength.current, active.current, GROW_RATE, FADE_RATE, delta);
  });

  return HANDS.map((bone, index) => (
    <InHand key={bone} figure={figure} bone={bone}>
      {() => <Blade color={color} strength={strength} seed={index * 1.7} />}
    </InHand>
  ));
}

/** A dark core inside a flickering glow in the accent, growing out from the hand with `strength`. */
function Blade({ color, strength, seed }: { color: string; strength: RefObject<number>; seed: number }) {
  const group = useRef<Group>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const tint = useGlowColor(color, 1.3);

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
        {/* Inner faces only: the dark core hides the middle, so the glow rims its edges. */}
        <AdditiveMaterial ref={glow} color={tint} side={BackSide} />
      </mesh>
    </group>
  );
}
