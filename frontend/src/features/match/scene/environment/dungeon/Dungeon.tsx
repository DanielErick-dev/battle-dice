"use client";

import { Sparkles } from "@react-three/drei";
import { useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { TiledFloor, Vault } from "../shared/Backdrop";
import { Flames } from "../shared/Flames";
import { KitPieces } from "../shared/KitPieces";
import { TrailRoad } from "../shared/TrailRoad";
import { TRAIL_GROUND } from "../shared/trailPlan";
import { planDungeon } from "./plan";
import { paintFlagstoneRoad, paintHallFloor } from "./textures";

/** World units per repeat of the floor's flagstones. */
const FLOOR_REPEAT = 6;

/**
 * The dungeon map: a vast flagstoned hall under a dark vault, walls on three sides lit by torches,
 * pillars, barrels, crates and treasure between the rows, and dust in the air.
 */
export function Dungeon({ trail }: { trail: readonly Vec3[] }) {
  const plan = useMemo(() => planDungeon(trail), [trail]);
  const { minX, maxX, minZ, maxZ } = plan.bounds;
  const [width, depth] = [maxX - minX, maxZ - minZ];
  const [x, z] = [(minX + maxX) / 2, (minZ + maxZ) / 2];

  return (
    <group>
      <Vault x={x} z={z} radius={Math.max(width, depth) * 1.6} color="#07050b" />
      <TiledFloor
        x={x}
        z={z}
        width={width + 8}
        depth={depth + 8}
        repeat={FLOOR_REPEAT}
        paint={paintHallFloor}
        seed={5}
        color="#7a7682"
        roughness={0.9}
      />
      <TrailRoad trail={trail} heightAt={() => TRAIL_GROUND} paint={paintFlagstoneRoad} />
      <KitPieces kit="dungeon" items={plan.pieces} />
      <Flames flames={plan.flames} />
      <Sparkles
        count={Math.round(width * depth * 0.05)}
        scale={[width, 5, depth]}
        position={[x, 2.5, z]}
        size={2}
        speed={0.15}
        color="#c9b89a"
        opacity={0.5}
      />
    </group>
  );
}
