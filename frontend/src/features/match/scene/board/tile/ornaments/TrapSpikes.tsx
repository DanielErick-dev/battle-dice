"use client";

import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

const SPIKE_SPOTS: readonly [number, number][] = [
  [-0.35, 0.05],
  [0, -0.1],
  [0.35, 0.05],
  [0.2, -0.45],
  [0.5, -0.4],
];

export function TrapSpikes({ color }: { color: string }) {
  return (
    <group position-y={TILE_HEIGHT / 2}>
      {SPIKE_SPOTS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.16, z]} castShadow>
          <coneGeometry args={[0.1, 0.32, 6]} />
          <meshStandardMaterial
            color="#3a0a0f"
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
