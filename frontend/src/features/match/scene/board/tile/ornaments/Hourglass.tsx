"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Group } from "three";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

/** Slowly turning hourglass: two cones tip to tip between caps. */
export function Hourglass({ color }: { color: string }) {
  const glass = useRef<Group>(null);

  useFrame((_, delta) => {
    if (glass.current) glass.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={glass} position-y={TILE_HEIGHT / 2 + 0.45} scale={0.85}>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position-y={side * 0.19} rotation-x={side > 0 ? Math.PI : 0}>
            <coneGeometry args={[0.2, 0.36, 16, 1, true]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.55}
              side={DoubleSide}
            />
          </mesh>
          <mesh position-y={side * 0.39} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
