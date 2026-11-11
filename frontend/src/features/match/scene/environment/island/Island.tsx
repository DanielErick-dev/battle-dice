"use client";

import { useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { ChimneySmoke } from "../ChimneySmoke";
import { planCoast } from "../coast";
import { groundAt, islandShape } from "../islandTerrain";
import { KitPieces } from "../kits";
import { paintDirtRoad, TrailRoad } from "../road";
import { KIT_SCALE, planSettlements } from "../settlements";
import { Bridges } from "./Bridges";
import { GrassTufts } from "./GrassTufts";
import { useIslandGround } from "./ground";
import { Lantern } from "./Lantern";
import { bridgeSpans, lanternSpots, scatterProps } from "./scatter";
import { Woods } from "./Woods";

/** Cools and darkens the cartoon kits' bright colours (blue roofs, green bushes) into the night. */
const TOWN_TINT = "#868894";
const COUNTRY_TINT = "#7a8279";

/**
 * The island the trail winds across on a grim night: low-poly hills of dark grass, trodden mud under the
 * tiles, a grey shore running into the sea, snowy mountains behind where the trail begins and a stream the
 * trail crosses on wooden bridges; tall pines where they hide no tile (Meshy models), bushes, boulders and
 * grass tufts in between, and lanterns along the way.
 */
export function Island({ trail }: { trail: readonly Vec3[] }) {
  const shape = useMemo(() => islandShape(trail), [trail]);
  const ground = useIslandGround(shape);
  const town = useMemo(() => planSettlements(shape, trail), [shape, trail]);
  const scatter = useMemo(() => scatterProps(shape, trail, town.blockers), [shape, trail, town]);
  const coast = useMemo(() => planCoast(shape, trail, town, scatter), [shape, trail, town, scatter]);
  const townItems = useMemo(
    () => town.placements.map((placement) => ({ ...placement, scale: placement.scale * KIT_SCALE })),
    [town],
  );
  const lanterns = useMemo(() => lanternSpots(trail, shape), [trail, shape]);
  const bridges = useMemo(() => bridgeSpans(trail, shape), [trail, shape]);

  return (
    <group>
      <mesh geometry={ground.geometry} material={ground.material} receiveShadow />
      <TrailRoad trail={trail} heightAt={(x, z) => groundAt(shape, x, z).height} paint={paintDirtRoad} />
      <Woods trees={scatter.trees} groves={scatter.groves} />
      <KitPieces kit="kaykit" items={townItems} tint={TOWN_TINT} />
      <KitPieces kit="kenney" items={coast.pieces} tint={COUNTRY_TINT} />
      <ChimneySmoke chimneys={town.chimneys} />
      <GrassTufts tufts={scatter.tufts} />
      <Bridges spans={bridges} />
      {lanterns.map(([x, y, z], index) => (
        <Lantern key={index} position={[x, y, z]} />
      ))}
    </group>
  );
}
