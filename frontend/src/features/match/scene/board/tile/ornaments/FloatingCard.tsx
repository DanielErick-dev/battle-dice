"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

/** A small glowing card spinning above the tile. */
export function FloatingCard({ color }: { color: string }) {
  const card = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!card.current) return;
    card.current.rotation.y += delta * 1.6;
    card.current.position.y = 0.95 + Math.sin(clock.elapsedTime * 2) * 0.1;
  });

  return (
    <group>
      <group ref={card} rotation-z={0.15}>
        <RoundedBox args={[0.42, 0.6, 0.03]} radius={0.04} smoothness={2} castShadow>
          <meshStandardMaterial
            color="#fdf2f8"
            emissive={color}
            emissiveIntensity={1.4}
            metalness={0.4}
            roughness={0.25}
          />
        </RoundedBox>
      </group>
      <Sparkles count={12} scale={[0.9, 1.2, 0.9]} position-y={0.9} size={2.5} speed={0.6} color={color} />
    </group>
  );
}
