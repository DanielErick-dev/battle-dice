"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Group, type Mesh } from "three";
import { TILE_SIZE, type Vec3 } from "@/features/shared/board/boardLayout";
import { FIGURE_HEIGHT } from "@/features/characters/core/figure";
import { preloadProps, useFittedProp } from "@/features/characters/core/props";
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

preloadProps(["tenzaiBoulder"]);

const ROWS = 4;
const PER_ROW = 3;
/** Always as tall as a figure, so it reads as a real barrier next to whoever it blocks. */
const WALL_HEIGHT = FIGURE_HEIGHT;

/** A wall of stacked boulders (Meshy) across the path; stones fall off from the top as its hp drops. */
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
  const boulder = useFittedProp("tenzaiBoulder");
  const stones = useMemo(() => {
    const width = TILE_SIZE * 1.2;
    const cell = width / PER_ROW;
    const rowHeight = WALL_HEIGHT / ROWS;
    const [boulderWidth, , boulderDepth] = boulder.size;
    return Array.from({ length: ROWS * PER_ROW }, (_, index) => {
      const row = Math.floor(index / PER_ROW);
      const column = index % PER_ROW;
      const offset = row % 2 === 0 ? 0 : cell / 2 - cell / 4;
      const grow = 1.25 + jitter(seed * 3 + index) * 0.2;
      return {
        key: index,
        position: [
          -width / 2 + cell / 2 + column * cell + offset - (row % 2 ? cell / 4 : 0),
          row * rowHeight * 0.92,
          jitter(seed + index) * 0.1,
        ] as Vec3,
        scale: [(cell * grow) / boulderWidth, rowHeight * 1.2, (0.7 * grow) / boulderDepth] as Vec3,
        turn: jitter(seed * 7 + index) * 0.8,
      };
    });
  }, [seed, boulder.size]);

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
            geometry={boulder.geometry}
            material={boulder.material}
            position={stone.position}
            rotation-y={stone.turn}
            scale={stone.scale}
            castShadow
          />
        ))}
      </group>
      <Html center position-y={WALL_HEIGHT + 0.35} zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-black whitespace-nowrap text-amber-300 ring-1 ring-amber-500/40">
          🪨 {hp}/{maxHp}
        </div>
      </Html>
    </group>
  );
}
