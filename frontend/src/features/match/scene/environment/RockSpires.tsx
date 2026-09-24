"use client";

import { useMemo } from "react";
import { seededRandom } from "../random";

interface RockSpiresProps {
  /** Spires start this far from the arena centre... */
  innerRadius: number;
  /** ...and are scattered out to here. */
  outerRadius: number;
  /** Water level, where their bases sit. */
  level: number;
  count: number;
}

interface Spire {
  x: number;
  z: number;
  height: number;
  radius: number;
  tilt: number;
  turn: number;
}

/** Tall rock formations rising from the sea around the arena, placed deterministically. */
export function RockSpires({ innerRadius, outerRadius, level, count }: RockSpiresProps) {
  const spires = useMemo<Spire[]>(() => {
    const random = seededRandom(7);
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + random() * 0.4;
      const distance = innerRadius + random() * (outerRadius - innerRadius);
      const size = 0.6 + random() * 0.9;
      return {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        height: (4 + random() * 7) * size,
        radius: (0.9 + random() * 0.8) * size,
        tilt: (random() - 0.5) * 0.25,
        turn: random() * Math.PI,
      };
    });
  }, [count, innerRadius, outerRadius]);

  return (
    <group position-y={level}>
      {spires.map((spire, i) => (
        <group key={i} position={[spire.x, 0, spire.z]} rotation={[spire.tilt, spire.turn, spire.tilt / 2]}>
          <mesh position-y={spire.height / 2 - 0.4} castShadow>
            <cylinderGeometry args={[spire.radius * 0.45, spire.radius, spire.height, 7, 3]} />
            <meshStandardMaterial color="#2c2a3d" roughness={0.95} flatShading />
          </mesh>
          <mesh position-y={spire.height - 0.3} scale={[1, 0.6, 1]}>
            <dodecahedronGeometry args={[spire.radius * 0.55, 0]} />
            <meshStandardMaterial color="#35324a" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}
