"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshStandardMaterial } from "three";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

/** Three chevrons that light up in sequence along the direction of travel. */
export function AdvanceChevrons({ color, angle }: { color: string; angle: number }) {
  const chevrons = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    chevrons.current.forEach((material, i) => {
      if (!material) return;
      const wave = (Math.sin(clock.elapsedTime * 6 - i * 1.2) + 1) / 2;
      material.emissiveIntensity = 0.6 + wave * 2.4;
    });
  });

  return (
    <group position-y={TILE_HEIGHT / 2 + 0.12} rotation-y={-angle}>
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={x} position-x={x} rotation-z={-Math.PI / 2} scale={[1, 1, 0.35]}>
          <coneGeometry args={[0.2, 0.26, 3]} />
          <meshStandardMaterial
            ref={(material) => {
              chevrons.current[i] = material;
            }}
            color={color}
            emissive={color}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
