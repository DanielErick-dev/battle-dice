"use client";

import { Sparkles } from "@react-three/drei";
import { useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";

/** Embers or motes drifting along the whole track. */
export function TrackSparkles({ positions, color }: { positions: readonly Vec3[]; color: string }) {
  const { center, size } = useMemo(() => {
    const xs = positions.map(([x]) => x);
    const ys = positions.map(([, y]) => y);
    const zs = positions.map(([, , z]) => z);
    const span = (values: number[]) => Math.max(...values) - Math.min(...values);
    const middle = (values: number[]) => (Math.max(...values) + Math.min(...values)) / 2;
    return {
      center: [middle(xs), middle(ys) + 1, middle(zs)] as Vec3,
      size: [span(xs) + 3, span(ys) + 3, span(zs) + 3] as Vec3,
    };
  }, [positions]);
  return <Sparkles count={80} scale={size} position={center} size={4} speed={1} color={color} />;
}
