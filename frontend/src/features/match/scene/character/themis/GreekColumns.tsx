"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useAge } from "../../useAge";
import { preloadProps, Prop, usePropMesh } from "../core/props";
import { clamp01, easeOutCubic } from "../shared/easing";

/** In shares of the figure's height: how tall, how far to each side and how far behind her. */
const HEIGHT = 1.25;
const SIDE = 0.55;
const BACK = 0.4;
const RISE_SECONDS = 0.9;
/** Radians the columns shudder by as they push up out of the ground. */
const SHUDDER = 0.02;

preloadProps(["greekColumn"]);

/**
 * Two ivy-crowned Greek columns flanking Themis on her intro stage: they push up out of the ground as her
 * sword strikes it (`riseSeconds`, in real seconds) and stay standing. Menu stage only, never in a match.
 */
export function GreekColumns({ size, riseSeconds }: { size: number; riseSeconds: number }) {
  const age = useAge();
  const column = usePropMesh("greekColumn");
  const sides = useRef<(Group | null)[]>([]);
  const height = size * HEIGHT;

  useFrame(({ clock }) => {
    const rise = clamp01((age(clock.elapsedTime) - riseSeconds) / RISE_SECONDS);
    const shudder = rise > 0 && rise < 1 ? SHUDDER * (1 - rise) : 0;
    sides.current.forEach((side, index) => {
      if (!side) return;
      side.visible = rise > 0;
      side.position.y = -height * (1 - easeOutCubic(rise));
      side.rotation.z = Math.sin(clock.elapsedTime * 40 + index * 2) * shudder;
    });
  });

  return [-1, 1].map((side, index) => (
    <group key={side} position={[side * size * SIDE, 0, -size * BACK]}>
      <group
        ref={(group) => {
          sides.current[index] = group;
        }}
        visible={false}
      >
        <Prop geometry={column.geometry} material={column.material} height={height} standing />
      </group>
    </group>
  ));
}
