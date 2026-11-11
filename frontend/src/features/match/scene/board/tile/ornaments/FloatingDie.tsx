"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

export function FloatingDie({ color }: { color: string }) {
  const die = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!die.current) return;
    die.current.rotation.x += delta * 0.9;
    die.current.rotation.y += delta * 1.3;
    die.current.position.y = 0.85 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
  });

  return (
    <group ref={die}>
      <RoundedBox args={[0.42, 0.42, 0.42]} radius={0.07} smoothness={3} castShadow>
        <meshStandardMaterial color="#f4f4f5" emissive={color} emissiveIntensity={0.35} roughness={0.3} />
      </RoundedBox>
      <Sparkles count={10} scale={[0.9, 0.9, 0.9]} size={2.5} speed={0.5} color={color} />
    </group>
  );
}
