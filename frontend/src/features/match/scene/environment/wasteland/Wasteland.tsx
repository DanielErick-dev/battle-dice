"use client";

import { Sparkles } from "@react-three/drei";
import { useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { TiledFloor, Vault } from "../shared/Backdrop";
import { ChimneySmoke } from "../shared/ChimneySmoke";
import { Flames } from "../shared/Flames";
import { KitPieces } from "../shared/KitPieces";
import { TrailRoad } from "../shared/TrailRoad";
import { TRAIL_GROUND } from "../shared/trailPlan";
import { planWasteland } from "./plan";
import { paintCrackedEarth, paintCrackedRoad } from "./textures";

const GROUND_REPEAT = 8;

export function Wasteland({ trail }: { trail: readonly Vec3[] }) {
  const plan = useMemo(() => planWasteland(trail), [trail]);
  const { minX, maxX, minZ, maxZ } = plan.bounds;
  const [width, depth] = [maxX - minX + 30, maxZ - minZ + 30];
  const [x, z] = [(minX + maxX) / 2, (minZ + maxZ) / 2];

  return (
    <group>
      {/* A low sky of smoke and soot. */}
      <Vault x={x} z={z} radius={Math.max(width, depth) * 1.4} color="#2a201b" />
      <TiledFloor
        x={x}
        z={z}
        width={width}
        depth={depth}
        repeat={GROUND_REPEAT}
        paint={paintCrackedEarth}
        seed={9}
        color="#8a7c6e"
        roughness={1}
      />
      <TrailRoad trail={trail} heightAt={() => TRAIL_GROUND} paint={paintCrackedRoad} />
      <KitPieces kit="wasteland" items={plan.pieces} />
      <KitPieces kit="wasteland" items={plan.wrecks} tint="#7a5a44" />
      <Flames flames={plan.fires} />
      <ChimneySmoke chimneys={plan.fires} />
      <Sparkles
        count={Math.round((maxX - minX) * (maxZ - minZ) * 0.08)}
        scale={[maxX - minX, 8, maxZ - minZ]}
        position={[x, 4, z]}
        size={2.5}
        speed={0.3}
        color="#bdb3a8"
        opacity={0.6}
      />
    </group>
  );
}
