"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Mesh } from "three";
import { useGlowColor } from "@/features/characters/shared/glowColor";
import { TILE_HEIGHT, TILE_SIZE } from "@/features/shared/board/boardLayout";

/** Obsidian stalactites dripping lava-light under an infernal tile. */
export function MoltenUnderside({ color }: { color: string }) {
  return (
    <group position-y={-TILE_HEIGHT / 2}>
      {[
        [0, 0, 0.9],
        [-0.45, 0.3, 0.6],
        [0.4, -0.35, 0.55],
      ].map(([x, z, length]) => (
        <mesh key={`${x}:${z}`} position={[x, -length / 2, z]} rotation-x={Math.PI}>
          <coneGeometry args={[0.28, length, 6]} />
          <meshStandardMaterial
            color="#120404"
            emissive={color}
            emissiveIntensity={0.9}
            roughness={0.35}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A slowly turning golden halo floating under a celestial tile. */
export function HaloUnderside({ color, phase }: { color: string; phase: number }) {
  const halo = useRef<Mesh>(null);
  const glow = useGlowColor(color, 2.2);
  useFrame(({ clock }) => {
    if (halo.current) halo.current.rotation.z = clock.elapsedTime * 0.5 + phase;
  });
  return (
    <mesh ref={halo} position-y={-TILE_HEIGHT / 2 - 0.35} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[TILE_SIZE * 0.42, 0.05, 8, 48]} />
      <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.9} blending={AdditiveBlending} />
    </mesh>
  );
}
