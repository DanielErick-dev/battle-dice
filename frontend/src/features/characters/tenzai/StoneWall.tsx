"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Group, type Mesh } from "three";
import { TILE_SIZE, type Vec3 } from "@/features/shared/board/boardLayout";
import { useAge } from "@/features/shared/three/useAge";
import { clamp01, easeOut } from "./palette";

const RISE_SECONDS = 0.45;
/** A full wall knocked down over this long (the punch combo). */
const CRUMBLE_SECONDS = 2.2;

/** Seeded jitter so each wall's stones sit the same way on every render. */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/** A wall of stacked stones across the path; it sinks and cracks as its hp drops. */
export function StoneWall({
  position,
  heading,
  hp,
  maxHp,
  seed,
}: {
  position: Vec3;
  heading: number;
  hp: number;
  maxHp: number;
  seed: number;
}) {
  const root = useRef<Group>(null);
  const age = useAge();
  const health = maxHp > 0 ? hp / maxHp : 0;
  const stones = useMemo(() => {
    const rows = 3;
    const perRow = 4;
    const width = TILE_SIZE * 1.15;
    return Array.from({ length: rows * perRow }, (_, index) => {
      const row = Math.floor(index / perRow);
      const column = index % perRow;
      const offset = row % 2 === 0 ? 0 : width / perRow / 2;
      return {
        key: index,
        position: [
          -width / 2 + width / perRow / 2 + column * (width / perRow) + offset - (row % 2 ? width / perRow / 4 : 0),
          0.22 + row * 0.38,
          jitter(seed + index) * 0.08,
        ] as Vec3,
        scale: [width / perRow - 0.04, 0.36, 0.42 + jitter(seed * 3 + index) * 0.08] as Vec3,
        tint: index % 3 === 0 ? "#78350f" : index % 3 === 1 ? "#92400e" : "#a16207",
      };
    });
  }, [seed]);

  // Shown health eases down over a run of punches, knocking stones off from the top one by one.
  const shown = useRef(health);
  const parts = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const rise = easeOut(clamp01(age(clock.elapsedTime) / RISE_SECONDS));
    root.current.scale.y = Math.max(0.01, rise);
    const falling = shown.current > health;
    shown.current = falling ? Math.max(health, shown.current - delta / CRUMBLE_SECONDS) : health;
    const standing = Math.ceil(stones.length * (0.25 + 0.75 * shown.current));
    parts.current.forEach((part, index) => {
      if (part) part.visible = index < standing;
    });
    // Shudders while it takes the blows.
    root.current.position.x = falling ? Math.sin(clock.elapsedTime * 60) * 0.03 : 0;
  });

  return (
    <group position={position} rotation-y={heading}>
      <group ref={root}>
        {stones.map((stone, index) => (
          <mesh
            key={stone.key}
            ref={(mesh) => {
              parts.current[index] = mesh;
            }}
            position={stone.position}
            scale={stone.scale}
            castShadow
          >
            <boxGeometry />
            <meshStandardMaterial color={stone.tint} roughness={0.95} flatShading />
          </mesh>
        ))}
      </group>
      <Html center position-y={1.75} zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-black whitespace-nowrap text-amber-300 ring-1 ring-amber-500/40">
          🪨 {hp}/{maxHp}
        </div>
      </Html>
    </group>
  );
}
