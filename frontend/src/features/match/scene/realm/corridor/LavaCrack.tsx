"use client";

import { useMemo } from "react";
import type { Color } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { crackSegments } from "./layout";

/** A jagged crack of lava running down the inner face of an infernal wall. */
export function LavaCrack({ glow, side, position, seed }: { glow: Color; side: number; position: Vec3; seed: number }) {
  const segments = useMemo(() => crackSegments(seed), [seed]);
  return (
    <group position={position}>
      {segments.map(({ y, z, length, tilt }, index) => (
        <mesh key={index} position={[0, y, z]} rotation-x={side * tilt}>
          <boxGeometry args={[0.03, length, 0.05]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
