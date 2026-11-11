"use client";

import { useGlowColor } from "@/features/characters/shared/glowColor";
import { CORRIDOR_HALF_WIDTH, TILE_PITCH, type Vec3 } from "@/features/shared/board/boardLayout";
import { LavaCrack } from "./LavaCrack";
import { corridorSpan, everyNthDepth, LOOK, WALL_HEIGHT, WALL_THICKNESS } from "./layout";
import { Pillar } from "./Pillar";

/** A pillar stands against each wall every this many tiles. */
const PILLAR_EVERY = 3;

/** Hell's corridor: a tight passage of dark basalt walls split by seams of lava, shut at the far end. */
export function InfernalPassage({ positions }: { positions: readonly Vec3[] }) {
  const look = LOOK.infernal;
  const halfWidth = CORRIDOR_HALF_WIDTH.infernal;
  const glow = useGlowColor(look.trim, 2.4);
  const { x, far, length, centreZ, floorY } = corridorSpan(positions);
  const wallY = floorY + WALL_HEIGHT / 2;
  const wallX = halfWidth + WALL_THICKNESS / 2;
  const pillars = everyNthDepth(positions, PILLAR_EVERY);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, floorY - 0.1, centreZ]} receiveShadow>
        <boxGeometry args={[halfWidth * 2 + WALL_THICKNESS * 2, 0.2, length]} />
        <meshStandardMaterial color={look.floor} roughness={look.roughness} metalness={0.15} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * wallX, wallY, centreZ]} castShadow receiveShadow>
            <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, length]} />
            <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} />
          </mesh>
          {/* A seam of lava along the middle. */}
          <mesh position={[side * (wallX - WALL_THICKNESS / 2 - 0.01), floorY + WALL_HEIGHT * 0.45, centreZ]}>
            <boxGeometry args={[0.04, 0.06, length]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
          {pillars.map((z) => (
            <Pillar key={z} realm="infernal" glow={glow} position={[side * (halfWidth - 0.05), floorY, z]} />
          ))}
          {pillars.map((z, index) => (
            <LavaCrack
              key={z}
              glow={glow}
              side={side}
              position={[side * (wallX - WALL_THICKNESS / 2 - 0.02), floorY, z + TILE_PITCH * 1.5]}
              seed={index + side}
            />
          ))}
        </group>
      ))}

      <mesh position={[0, wallY, far - WALL_THICKNESS / 2]} castShadow>
        <boxGeometry args={[halfWidth * 2 + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} />
      </mesh>
    </group>
  );
}
