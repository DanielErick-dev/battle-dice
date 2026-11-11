"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, DoubleSide, type Group } from "three";
import { FIGURE_HEIGHT } from "@/features/characters/core/figure";

/** Where the finish's trophy hovers: at chest height over the empty tile, over the head of whoever stands on it. */
const TROPHY_HEIGHT = 1.9;
const TROPHY_HEIGHT_OCCUPIED = FIGURE_HEIGHT + 0.7;

export function FinishBeacon({ color, occupied }: { color: string; occupied: boolean }) {
  const trophy = useRef<Group>(null);
  const height = useRef(TROPHY_HEIGHT);

  useFrame(({ clock }, delta) => {
    if (!trophy.current) return;
    const goal = occupied ? TROPHY_HEIGHT_OCCUPIED : TROPHY_HEIGHT;
    height.current += (goal - height.current) * Math.min(1, delta * 4);
    trophy.current.rotation.y = clock.elapsedTime * 0.8;
    trophy.current.position.y = height.current + Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  return (
    <group>
      <mesh position-y={1.6}>
        <cylinderGeometry args={[0.55, 0.75, 3, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <group ref={trophy}>
        <mesh castShadow>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>
      <pointLight color={color} intensity={3} distance={4} position-y={1.2} />
    </group>
  );
}
