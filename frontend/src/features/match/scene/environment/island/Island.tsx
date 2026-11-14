"use client";

import { useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { ChimneySmoke } from "../shared/ChimneySmoke";
import { KitPieces } from "../shared/KitPieces";
import { TrailRoad } from "../shared/TrailRoad";
import { Bridges } from "./Bridges";
import { planCoast } from "./coast";
import { paintDirtRoad } from "./dirtRoad";
import { GrassTufts } from "./GrassTufts";
import { useIslandGround } from "./ground";
import { Bench, Lantern, MESHY_SWAPS, SwappedPiece, TrailSign } from "./Furniture";
import { bridgeSpans, lanternSpots, scatterProps } from "./scatter";
import { planSettlements } from "./settlements";
import { groundAt, type IslandShape } from "./terrain";
import { KIT_SCALE } from "./townPieces";
import { Woods } from "./Woods";

/** How far round a piece the ground is sampled: it sits on the lowest point, never hanging off a slope. */
const TOWN_FOOTPRINT = 1;
const COAST_FOOTPRINT = 0.5;
/** Every few lamp posts, a bench beside one. */
const BENCH_EVERY = 3;

/** The lowest ground under a piece's footprint, so it never floats over a drop. */
function settled(shape: IslandShape, { x, y, z }: { x: number; y: number; z: number }, radius: number): number {
  let lowest = y;
  for (let step = 0; step < 8; step++) {
    const angle = (step / 8) * Math.PI * 2;
    lowest = Math.min(lowest, groundAt(shape, x + Math.cos(angle) * radius, z + Math.sin(angle) * radius).height);
  }
  return lowest;
}

/** Cools and darkens the cartoon kits' bright colours (blue roofs, green bushes) into the night. */
const TOWN_TINT = "#868894";
const COUNTRY_TINT = "#7a8279";

/**
 * The island the trail winds across on a grim night: low-poly hills of dark grass, trodden mud under the
 * tiles, a grey shore running into the sea, snowy mountains behind where the trail begins and a stream the
 * trail crosses on wooden bridges; tall pines where they hide no tile (Meshy models), bushes, boulders and
 * grass tufts in between, and lanterns along the way.
 */
export function Island({ trail, shape }: { trail: readonly Vec3[]; shape: IslandShape }) {
  const ground = useIslandGround(shape);
  const town = useMemo(() => planSettlements(shape, trail), [shape, trail]);
  const scatter = useMemo(() => scatterProps(shape, trail, town.blockers), [shape, trail, town]);
  const coast = useMemo(() => planCoast(shape, trail, town, scatter), [shape, trail, town, scatter]);
  const townItems = useMemo(
    () =>
      town.placements.map((placement) => ({
        ...placement,
        y: settled(shape, placement, TOWN_FOOTPRINT * placement.scale),
        scale: placement.scale * KIT_SCALE,
      })),
    [town, shape],
  );
  const coastItems = useMemo(
    () => coast.pieces.map((piece) => ({ ...piece, y: settled(shape, piece, COAST_FOOTPRINT) })),
    [coast, shape],
  );
  // Kit pieces swapped for Meshy models at the same spots.
  const kitTown = townItems.filter((item) => !(item.piece in MESHY_SWAPS));
  const kitCoast = coastItems.filter((item) => !(item.piece in MESHY_SWAPS));
  const swapped = [...townItems, ...coastItems].filter((item) => item.piece in MESHY_SWAPS);
  const lanterns = useMemo(() => lanternSpots(trail, shape), [trail, shape]);
  const bridges = useMemo(() => bridgeSpans(trail, shape), [trail, shape]);

  return (
    <group>
      <mesh geometry={ground.geometry} material={ground.material} receiveShadow />
      <TrailRoad trail={trail} heightAt={(x, z) => groundAt(shape, x, z).height} paint={paintDirtRoad} />
      <Woods trees={scatter.trees} groves={scatter.groves} />
      <KitPieces kit="kaykit" items={kitTown} tint={TOWN_TINT} />
      <KitPieces kit="kenney" items={kitCoast} tint={COUNTRY_TINT} />
      {swapped.map((item, index) => (
        <SwappedPiece key={index} item={item} />
      ))}
      {trail[0] && (
        <TrailSign
          position={[trail[0][0] - 2.2, groundAt(shape, trail[0][0] - 2.2, trail[0][2]).height, trail[0][2]]}
        />
      )}
      <ChimneySmoke chimneys={town.chimneys} />
      <GrassTufts tufts={scatter.tufts} />
      <Bridges spans={bridges} />
      {lanterns.map(([x, y, z], index) => (
        <Lantern key={index} position={[x, y, z]} />
      ))}
      {lanterns
        .filter((_, index) => index % BENCH_EVERY === 1)
        .map(([x, y, z], index) => (
          <Bench key={index} position={[x + 0.9, y, z + 0.4]} turn={index * 1.3} />
        ))}
    </group>
  );
}
