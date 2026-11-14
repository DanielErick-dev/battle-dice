"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Vec3 } from "@/features/shared/board/boardLayout";
import { ELEMENT_COLOR } from "./palette";

/** A rope of water from one figure to another, flowing towards the one it drags along. */
export function WaterTether({ from, to }: { from: Vec3; to: Vec3 }) {
  const outer = useRef<{ material: { dashOffset: number } } | null>(null);
  const mid: Vec3 = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 1.4, (from[2] + to[2]) / 2];
  const start: Vec3 = [from[0], from[1] + 0.9, from[2]];
  const end: Vec3 = [to[0], to[1] + 0.9, to[2]];
  useFrame((_, delta) => {
    if (outer.current) outer.current.material.dashOffset -= delta * 2;
  });
  return (
    <group>
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color={ELEMENT_COLOR.water}
        lineWidth={5}
        transparent
        opacity={0.55}
      />
      <QuadraticBezierLine
        ref={outer as never}
        start={start}
        end={end}
        mid={mid}
        color="#e0f2fe"
        lineWidth={1.6}
        dashed
        dashScale={6}
        dashSize={0.6}
        gapSize={0.4}
      />
    </group>
  );
}
