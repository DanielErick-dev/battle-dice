"use client";

import { useMemo } from "react";
import type { CharacterId } from "@/features/characters";
import type { BoardLayout } from "@/features/shared/board/boardLayout";
import { RealmParticles } from "../../realm/RealmParticles";
import { Ocean } from "../ocean/Ocean";
import { NightStars } from "../sky/NightStars";
import { SkyDome } from "../sky/SkyDome";
import { Island } from "./Island";
import { islandShape, WATER_LEVEL } from "./terrain";

/** The island map whole: the island in the night sea under its sky, which changes with the realms. */
export function IslandWorld({
  layout,
  scale,
  characters,
}: {
  layout: BoardLayout;
  scale: number;
  characters: readonly CharacterId[];
}) {
  const skyRadius = 95 * scale;
  const moonPosition: [number, number, number] = [-0.3 * skyRadius, 0.28 * skyRadius, -0.8 * skyRadius];
  const shape = useMemo(() => islandShape(layout.trail), [layout.trail]);
  const reach = Math.max(shape.halfWidth, shape.halfDepth + Math.abs(shape.centerZ));

  return (
    <group>
      <SkyDome radius={skyRadius} moonPosition={moonPosition} moonRadius={4 * scale} />
      <NightStars radius={70 * scale} />
      <RealmParticles radius={reach + 10} />
      <Ocean
        level={WATER_LEVEL}
        size={skyRadius * 1.9}
        shoreHalfSize={[shape.halfWidth, shape.halfDepth]}
        shoreCenterZ={shape.centerZ}
        moonPosition={moonPosition}
      />
      <Island trail={layout.trail} shape={shape} characters={characters} />
    </group>
  );
}
