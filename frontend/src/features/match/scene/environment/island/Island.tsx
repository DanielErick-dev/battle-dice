"use client";

import { useEffect, useMemo } from "react";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { TrailRoad } from "../shared/TrailRoad";
import { Bridges } from "./Bridges";
import { planCoast } from "./coast";
import { paintDirtRoad } from "./dirtRoad";
import { GrassTufts } from "./GrassTufts";
import { useIslandGround } from "./ground";
import {
  Bench,
  Lanterns,
  MESHY_SWAPS,
  SCATTER_REACH,
  SCATTER_SWAPS,
  ScatterProps,
  SwappedPiece,
  TrailSign,
} from "./Furniture";
import type { PropId } from "@/features/characters/core/props";
import { bridgeSpans, benchSpots, lanternSpots, scatterProps, type LanternSpot } from "./scatter";
import { lampGlow, paintLampPools } from "../shared/lampGlow";
import { planSettlements } from "./settlements";
import { groundAt, WATER_LEVEL, type IslandShape } from "./terrain";
import { KIT_SCALE } from "./townPieces";
import { RiverDragon, SeaDragon } from "./SeaDragon";
import { Woods } from "./Woods";
import { CHARACTER_IDS, type CharacterId } from "@/features/characters";
import { Landmarks } from "./Landmarks";
import { LANDMARK_RADIUS, planLandmarks } from "./landmarks";

/** How far round a piece the ground is sampled: it sits on the lowest point, never hanging off a slope. */
const TOWN_FOOTPRINT = 1;
const COAST_FOOTPRINT = 0.5;
/** Pieces afloat keep their height: settling them would sink them to the sea floor. */
const AFLOAT = new Set(["boat-row-small", "structure-platform-dock"]);
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

/** Trees, rocks and bushes keep this far from a landmark's edge. */
const LANDMARK_CLEARING = 0.8;

interface IslandProps {
  trail: readonly Vec3[];
  shape: IslandShape;
  /** Characters in the match: only their landmarks stand on the island. */
  characters: readonly CharacterId[];
}

/**
 * The countryside pieces drawn as `prop`, each sat on the lowest ground under its whole spread (a wide rock on a
 * slope otherwise hangs off it); one whose spread reaches the water is left out, rather than float on the sea.
 */
function grounded<T extends { piece: string; x: number; y: number; z: number; scale: number }>(
  shape: IslandShape,
  items: readonly T[],
  prop: PropId,
): T[] {
  const reach = SCATTER_REACH[prop] ?? 0.5;
  return items.flatMap((item) => {
    const swap = SCATTER_SWAPS[item.piece];
    if (swap?.prop !== prop) return [];
    const spread = item.scale * swap.heightPerScale * reach;
    const lowest = Math.min(settled(shape, item, spread), settled(shape, item, spread / 2));
    return lowest < WATER_LEVEL + 0.1 ? [] : [{ ...item, y: lowest }];
  });
}

/** How far round a lamp its light falls on the ground. */
const LAMP_POOL_RADIUS = 2.2;

/** Lights the ground, road and slabs round every lamp post (see lampGlow) while the island is shown. */
function useLampPools(lanterns: readonly LanternSpot[], shape: IslandShape) {
  useEffect(() => {
    const [width, depth] = [shape.halfWidth * 2.3, shape.halfDepth * 2.3];
    const bounds = { minX: -width / 2, minZ: shape.centerZ - depth / 2, width, depth };
    const map = paintLampPools(
      lanterns.map(({ pool }) => pool),
      bounds,
      LAMP_POOL_RADIUS,
    );
    lampGlow.lampGlowMap.value = map;
    lampGlow.lampGlowBounds.value.set(bounds.minX, bounds.minZ, width, depth);
    lampGlow.lampGlowStrength.value = 1;
    return () => {
      lampGlow.lampGlowStrength.value = 0;
      lampGlow.lampGlowMap.value = null;
      map.dispose();
    };
  }, [lanterns, shape]);
}

/** Pines are placed only where they hide no tile from the camera. */
export function Island({ trail, shape, characters }: IslandProps) {
  const ground = useIslandGround(shape);
  const town = useMemo(() => planSettlements(shape, trail), [shape, trail]);
  // Planned for the whole roster, so each character's landmark always stands on its own spot.
  const allLandmarks = useMemo(() => planLandmarks(shape, trail, town.blockers, CHARACTER_IDS), [shape, trail, town]);
  const playing = characters.join(",");
  const landmarks = useMemo(
    () => allLandmarks.filter((spot) => playing.split(",").includes(spot.character)),
    [allLandmarks, playing],
  );
  const cleared = useMemo(() => {
    const reach = LANDMARK_RADIUS + LANDMARK_CLEARING;
    return <T extends { x: number; z: number }>(items: readonly T[]) =>
      items.filter((item) => landmarks.every((spot) => Math.hypot(spot.x - item.x, spot.z - item.z) > reach));
  }, [landmarks]);
  const rawScatter = useMemo(() => scatterProps(shape, trail, town.blockers), [shape, trail, town]);
  const scatter = useMemo(
    () => ({ ...rawScatter, trees: cleared(rawScatter.trees), groves: cleared(rawScatter.groves) }),
    [rawScatter, cleared],
  );
  // Planned from the whole scatter so the coast stays the same whoever plays; the landmarks clear it after.
  const coast = useMemo(() => planCoast(shape, trail, town, rawScatter), [shape, trail, town, rawScatter]);
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
    () =>
      cleared(coast.pieces).map((piece) =>
        AFLOAT.has(piece.piece) ? piece : { ...piece, y: settled(shape, piece, COAST_FOOTPRINT) },
      ),
    [coast, shape, cleared],
  );
  // Kit pieces swapped for Meshy models at the same spots.
  const scattered = useMemo(
    () =>
      [...new Set(Object.values(SCATTER_SWAPS).map(({ prop }) => prop))]
        .map((prop) => ({ prop, items: grounded(shape, coastItems, prop) }))
        .filter(({ items }) => items.length > 0),
    [shape, coastItems],
  );
  // Only our own models stand on the island: the downloaded kits' houses, fences, logs and crates are left out
  // (their plan still keeps the spots, for our own buildings later); a campfire went with the kit's tents.
  const swapped = [...townItems, ...coastItems].filter(
    (item) => item.piece in MESHY_SWAPS && item.piece !== "campfire_logs",
  );
  const lanterns = useMemo(() => lanternSpots(trail, shape), [trail, shape]);
  useLampPools(lanterns, shape);
  const benches = useMemo(() => benchSpots(trail, shape, BENCH_EVERY), [trail, shape]);
  const bridges = useMemo(() => bridgeSpans(trail, shape), [trail, shape]);

  return (
    <group>
      <mesh geometry={ground.geometry} material={ground.material} receiveShadow />
      <TrailRoad trail={trail} heightAt={(x, z) => groundAt(shape, x, z).height} paint={paintDirtRoad} />
      <Woods trees={scatter.trees} groves={scatter.groves} />
      {scattered.map(({ prop, items }) => (
        <ScatterProps key={prop} prop={prop} items={items} />
      ))}
      {swapped.map((item, index) => (
        <SwappedPiece key={index} item={item} />
      ))}
      {trail[0] && (
        <TrailSign
          position={[trail[0][0] - 2.2, groundAt(shape, trail[0][0] - 2.2, trail[0][2]).height, trail[0][2]]}
        />
      )}
      <Landmarks spots={landmarks} />
      <GrassTufts tufts={scatter.tufts} />
      <Bridges spans={bridges} />
      <SeaDragon shape={shape} />
      <RiverDragon shape={shape} />
      <Lanterns spots={lanterns} />
      {benches.map(({ at, turn }, index) => (
        <Bench key={index} position={at} turn={turn} />
      ))}
    </group>
  );
}
