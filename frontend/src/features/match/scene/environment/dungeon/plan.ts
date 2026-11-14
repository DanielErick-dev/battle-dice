import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import type { KitItem } from "../shared/kits";
import {
  clearOfStart,
  footprint,
  hidesTiles,
  isFree,
  pickWeighted,
  trailBounds,
  trailNearest,
  TRAIL_GROUND,
  type Blocker,
  type Bounds,
} from "../shared/trailPlan";
import { pick } from "@/features/shared/collections/items";

/** World units per KayKit Dungeon unit: a wall comes out a little taller than a figure. */
const DUNGEON_SCALE = 1.1;
/** A wall piece's width (and height) in kit units. */
const WALL = 4;
/** Room between the trail and the walls. */
const MARGIN = { side: 7, back: 6, front: 5 };
const FLOOR = TRAIL_GROUND;

/** Kit size (width, height, depth) of the pieces laid about the halls. */
const SIZES = {
  pillar: [1.5, 4, 1.5],
  pillar_decorated: [2.23, 4, 1.71],
  column: [0.7, 1.4, 0.7],
  barrel_large: [1.8, 2, 1.8],
  barrel_small_stack: [1.85, 1.77, 1],
  crates_stacked: [2.09, 2.14, 2.25],
  keg_decorated: [3.52, 2.05, 2],
  coin_stack_large: [1.44, 1.16, 1.66],
  coin_stack_medium: [0.99, 0.64, 1.03],
  candle_triple: [0.5, 0.87, 0.39],
  trunk_large_A: [1.5, 1, 1.3],
  table_long_decorated_A: [2.06, 1.89, 4],
  sword_shield_broken: [1.43, 1.96, 0.34],
} satisfies Record<string, [number, number, number]>;
type Furnishing = keyof typeof SIZES;
/** Halls' furnishings and how often each turns up; the treasure is rarer. */
const FURNISHINGS: readonly [[Furnishing, number, number], ...[Furnishing, number, number][]] = [
  // piece, weight, its own scale on top of DUNGEON_SCALE
  ["pillar_decorated", 2, 1],
  ["pillar", 2, 1],
  ["column", 3, 1],
  ["barrel_large", 3, 0.6],
  ["barrel_small_stack", 2, 0.6],
  ["crates_stacked", 3, 0.6],
  ["keg_decorated", 1, 0.6],
  ["trunk_large_A", 2, 0.7],
  ["coin_stack_large", 1, 0.6],
  ["coin_stack_medium", 2, 0.6],
  ["candle_triple", 3, 0.8],
  ["table_long_decorated_A", 1, 0.6],
  ["sword_shield_broken", 2, 0.7],
];
const WALLS = ["wall", "wall", "wall_cracked", "wall_arched", "wall_window_closed", "wall_broken"];

export interface DungeonPlan {
  bounds: Bounds;
  pieces: KitItem[];
  /** Torch flames on the walls and on the candles, in world space. */
  flames: Vec3[];
}

/** No wall in front and nothing that hides a tile from the camera; seeded, so the same every time. */
export function planDungeon(trail: readonly Vec3[]): DungeonPlan {
  const random = seededRandom(61);
  const bounds = trailBounds(trail, MARGIN);
  const pieces: KitItem[] = [];
  const flames: Vec3[] = [];
  const wall = WALL * DUNGEON_SCALE;

  /** One run of wall from `from` to `to` (x, z), facing `facing` (the way into the hall). */
  const run = (from: [number, number], to: [number, number], facing: number) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.max(1, Math.round(length / wall));
    for (let index = 0; index < count; index++) {
      const t = (index + 0.5) / count;
      const [x, z] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      const piece = index % 4 === 0 ? "wall_pillar" : pick(WALLS, random());
      pieces.push({ piece, x, y: FLOOR, z, turn: facing, scale: DUNGEON_SCALE });
      // Every other piece a torch, every few a banner, hung on the hall's side of it.
      const [ix, iz] = [Math.sin(facing) * 0.6 * DUNGEON_SCALE, Math.cos(facing) * 0.6 * DUNGEON_SCALE];
      if (index % 2 === 1) {
        pieces.push({
          piece: "torch_mounted",
          x: x + ix,
          y: FLOOR + 2.4,
          z: z + iz,
          turn: facing,
          scale: DUNGEON_SCALE,
        });
        flames.push([x + ix * 1.6, FLOOR + 2.4 + 0.8, z + iz * 1.6]);
      } else if (index % 4 === 2) {
        const banner = random() < 0.5 ? "banner_patternA_red" : "banner_shield_red";
        pieces.push({ piece: banner, x, y: FLOOR, z, turn: facing, scale: DUNGEON_SCALE });
      }
    }
  };
  const { minX, maxX, minZ, maxZ } = bounds;
  run([minX, minZ], [maxX, minZ], 0);
  run([minX, minZ], [minX, maxZ], Math.PI / 2);
  run([maxX, minZ], [maxX, maxZ], -Math.PI / 2);

  // The trail's own reach, kept clear: its tiles, the road either side, and the start's plaza.
  const clearOfTrail = (x: number, z: number, radius: number) =>
    trailNearest(trail, x, z).distance > 2 + radius && clearOfStart(trail, x, z, radius);
  const taken: Blocker[] = [];
  const area = (maxX - minX) * (maxZ - minZ);
  for (let attempt = Math.round(area * 1.2); attempt > 0; attempt--) {
    const x = minX + 2 + random() * (maxX - minX - 4);
    const z = minZ + 2 + random() * (maxZ - minZ - 3);
    const [piece, , own] = pickWeighted(FURNISHINGS, random) ?? FURNISHINGS[0];
    const size = SIZES[piece];
    const scale = DUNGEON_SCALE * own;
    const radius = footprint(size, scale);
    if (!clearOfTrail(x, z, radius) || hidesTiles(trail, x, z, size[1] * scale, radius)) continue;
    if (!isFree(taken, x, z, radius, 0.4)) continue;
    taken.push({ x, z, radius });
    pieces.push({ piece, x, y: FLOOR, z, turn: random() * Math.PI * 2, scale });
    if (piece === "candle_triple") flames.push([x, FLOOR + size[1] * scale + 0.1, z]);
  }

  return { bounds, pieces, flames };
}
