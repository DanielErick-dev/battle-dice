import type { Vec3 } from "@/features/shared/board/boardLayout";
import { TRAIL_GROUND } from "../shared/trailPlan";
import { fbm, noise, smoothstep } from "./terrainNoise";
import { itemAt } from "@/features/shared/collections/items";

/** Water surface height (see IslandWorld). */
export const WATER_LEVEL = -1.05;
/** Where the trodden earth gives way to grass, from the trail's centre line. */
export const TRAIL_EARTH = 1.6;
/** Room past the trail's sides and front, and (wider) at the back for the mountains. */
const MARGIN = { side: 10, front: 8, back: 11 };

/** The island round a trail: its extent, and the trail's segments to measure distances from. */
export interface IslandShape {
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  /** Where the trail's far end lies; the mountains rise behind it. */
  backZ: number;
  segments: readonly [number, number, number, number][];
  /** A stream running from the mountains to the front shore, across every row of the trail. */
  river: { x: number; bend: number };
}

/** Half the stream's width (wide enough that the trail needs a real bridge), and how deep below the sea its bed lies. */
export const RIVER_HALF_WIDTH = 2.6;
const RIVER_BED = 0.5;

/** The stream's centre line at depth `z`. */
export function riverX(shape: IslandShape, z: number): number {
  return shape.river.x + Math.sin(z * 0.11 + 1.3) * shape.river.bend;
}

/** How far a point is from the stream's middle, across it. */
export function riverDistance(shape: IslandShape, x: number, z: number): number {
  return Math.abs(x - riverX(shape, z));
}

export function islandShape(trail: readonly Vec3[]): IslandShape {
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const back = minZ - MARGIN.back;
  const front = maxZ + MARGIN.front;
  return {
    centerZ: (back + front) / 2,
    halfWidth: (maxX - minX) / 2 + MARGIN.side,
    halfDepth: (front - back) / 2,
    backZ: minZ,
    segments: trail.slice(1).map(([x, , z], index) => {
      const [fromX, , fromZ] = itemAt(trail, index);
      return [fromX, fromZ, x, z];
    }),
    river: { x: (maxX - minX) * 0.2, bend: Math.min(3, (maxX - minX) * 0.08) },
  };
}

/** Distance from the trail's centre line. */
export function trailDistance(shape: IslandShape, x: number, z: number): number {
  return trailNearest(shape, x, z).distance;
}

/** Distance from the trail's centre line, and how far along the trail its nearest point is (0 start, 1 finish). */
export function trailNearest(shape: IslandShape, x: number, z: number): { distance: number; along: number } {
  let distance = Infinity;
  let along = 0;
  shape.segments.forEach(([ax, az, bx, bz], index) => {
    const [dx, dz] = [bx - ax, bz - az];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < distance) [distance, along] = [d, (index + t) / Math.max(1, shape.segments.length)];
  });
  return { distance, along };
}

/** Where the castle grounds begin along the trail (see townPieces.ts REGIONS), and the village ends. */
export const CASTLE_FROM = 0.7;
export const VILLAGE_UNTIL = 0.36;

/** Over the land mask (see landMask): where the beach meets the sea, and where it gives way to grass. */
const BEACH = { from: 0.3, to: 0.99 };

/** 0 out at sea, 1 well inland: a rounded rectangle with a ragged shore. */
function landMask(shape: IslandShape, x: number, z: number): number {
  const u = Math.abs(x / shape.halfWidth);
  const v = Math.abs((z - shape.centerZ) / shape.halfDepth);
  const reach = (u ** 4 + v ** 4) ** 0.25 + (noise(x * 0.18, z * 0.18) - 0.5) * 0.12;
  return 1 - smoothstep(0.74, 1.02, reach);
}

/** The ground's height and what it's covered in at a point. */
export function groundAt(shape: IslandShape, x: number, z: number): { height: number; cover: Cover } {
  const land = landMask(shape, x, z);
  const { distance, along } = trailNearest(shape, x, z);
  // Rolling hills away from the trail; it runs on flat ground.
  const away = smoothstep(TRAIL_EARTH, TRAIL_EARTH + 3.5, distance);
  const hills = (fbm(x * 0.09, z * 0.09) - 0.35) * 2.2 * away;
  // Mountains along the far shore, behind where the trail begins.
  const behind = smoothstep(shape.backZ - 2, shape.backZ - 8, z);
  const peaks = behind * (2.5 + fbm(x * 0.16 + 9, z * 0.16) * 7) * away;
  const ground = TRAIL_GROUND + Math.max(-0.05, hills) + peaks;
  // The stream cuts through everything, the trail too: it crosses on bridges.
  const banks = smoothstep(RIVER_HALF_WIDTH * 0.6, RIVER_HALF_WIDTH + 0.9, riverDistance(shape, x, z));
  const inland = WATER_LEVEL - RIVER_BED + (ground - WATER_LEVEL + RIVER_BED) * banks;
  // A sandy beach rims the island, settling just over the water; never under the trail, nor below the mountains.
  const beach =
    (1 - smoothstep(BEACH.from, BEACH.to, land)) *
    smoothstep(TRAIL_EARTH + 1, TRAIL_EARTH + 2.5, distance) *
    (1 - behind);
  const beachTop = WATER_LEVEL + 0.2 + (noise(x * 0.3, z * 0.3) - 0.5) * 0.14;
  const shore = inland + (Math.min(inland, beachTop) - inland) * beach;
  // The trail's ground never slides into the sea, however near the shore it runs.
  const solid = Math.max(land, 1 - smoothstep(TRAIL_EARTH + 1, TRAIL_EARTH + 3, distance));
  const height = WATER_LEVEL - 0.9 + (shore - WATER_LEVEL + 0.9) * smoothstep(0, BEACH.from, solid);
  const cover: Cover =
    height > 4.2
      ? "snow"
      : peaks > 1.4
        ? "rock"
        : height < WATER_LEVEL + 0.45 || beach > 0.6
          ? "sand"
          : banks < 0.98
            ? "bank"
            : distance < TRAIL_EARTH * (0.85 + noise(x * 0.7, z * 0.7) * 0.3)
              ? "earth"
              : // The castle grounds are paved either side of the road.
                along > CASTLE_FROM && distance < TRAIL_EARTH + 1.3 + noise(x * 0.5, z * 0.5)
                ? "paving"
                : // Meadows thicken round the village.
                  noise(x * 0.12 + 40, z * 0.12) > (along < VILLAGE_UNTIL ? 0.38 : 0.55)
                  ? "meadow"
                  : "grass";
  return { height, cover };
}

export type Cover = "earth" | "grass" | "meadow" | "paving" | "sand" | "bank" | "rock" | "snow";
