import { seededRandom } from "@/game/domain/core/random";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "../boardLayout";
import { TRAIL_GROUND } from "./islandTerrain";
import type { KitItem } from "./kits";

/** World units per KayKit Dungeon unit: a wall comes out a little taller than a figure. */
export const DUNGEON_SCALE = 1.1;
/** A wall piece's width (and height) in kit units. */
const WALL = 4;
/** Room between the trail and the walls. */
const MARGIN = { side: 7, back: 6, front: 5 };
/** How far behind it (towards the far side) a thing of height h hides the floor, with the camera up at 45°. */
const SHADE_REACH = 1.15;
const FLOOR = TRAIL_GROUND;

/** Kit size (width, height, depth) of the pieces laid about the halls. */
const SIZES: Record<string, [number, number, number]> = {
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
  rubble_half: [4, 3.5, 3],
};
/** Halls' furnishings and how often each turns up; the treasure is rarer. */
const FURNISHINGS: readonly [string, number, number][] = [
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

export interface DungeonPlan {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  pieces: KitItem[];
  /** Torch flames on the walls and on the candles, in world space. */
  flames: Vec3[];
}

/**
 * A great dungeon hall round the trail: walls along the back and the sides (none in front, where they'd
 * hide the trail), torches and banners on them, pillars, barrels, crates, chests and coins between the
 * rows. Nothing hides a tile from the camera. The same every time.
 */
export function planDungeon(trail: readonly Vec3[]): DungeonPlan {
  const random = seededRandom(61);
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  const bounds = {
    minX: Math.min(...xs) - MARGIN.side,
    maxX: Math.max(...xs) + MARGIN.side,
    minZ: Math.min(...zs) - MARGIN.back,
    maxZ: Math.max(...zs) + MARGIN.front,
  };
  const pieces: KitItem[] = [];
  const flames: Vec3[] = [];
  const wall = WALL * DUNGEON_SCALE;
  const walls = ["wall", "wall", "wall_cracked", "wall_arched", "wall_window_closed", "wall_broken"];

  /** One run of wall from `from` to `to` (x, z), facing `facing` (the way into the hall). */
  const run = (from: [number, number], to: [number, number], facing: number) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.max(1, Math.round(length / wall));
    for (let index = 0; index < count; index++) {
      const t = (index + 0.5) / count;
      const [x, z] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      const piece = index % 4 === 0 ? "wall_pillar" : walls[Math.floor(random() * walls.length)];
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
  const segments = trail.slice(1).map((to, index) => [trail[index], to] as const);
  const clearOfTrail = (x: number, z: number, radius: number) =>
    segments.every(([a, b]) => {
      const [dx, dz] = [b[0] - a[0], b[2] - a[2]];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t) > 2 + radius;
    }) && Math.hypot(x - trail[0][0], z - trail[0][2]) > START_PLAZA + TILE_PITCH + radius;
  const hidesTiles = (x: number, z: number, height: number, spread: number) =>
    trail.some(([tx, , tz]) => tz < z + 1 && z - tz < height * SHADE_REACH && Math.abs(tx - x) < spread + 1.4);
  const taken: { x: number; z: number; radius: number }[] = [];
  const total = FURNISHINGS.reduce((sum, [, weight]) => sum + weight, 0);
  const area = (maxX - minX) * (maxZ - minZ);
  for (let attempt = Math.round(area * 1.2); attempt > 0; attempt--) {
    const x = minX + 2 + random() * (maxX - minX - 4);
    const z = minZ + 2 + random() * (maxZ - minZ - 3);
    let roll = random() * total;
    const [piece, , own] = FURNISHINGS.find(([, weight]) => (roll -= weight) < 0) ?? FURNISHINGS[0];
    const [width, height, depth] = SIZES[piece];
    const scale = DUNGEON_SCALE * own;
    const radius = (Math.max(width, depth) / 2) * scale;
    if (!clearOfTrail(x, z, radius) || hidesTiles(x, z, height * scale, radius)) continue;
    if (taken.some((other) => Math.hypot(other.x - x, other.z - z) < other.radius + radius + 0.4)) continue;
    taken.push({ x, z, radius });
    pieces.push({ piece, x, y: FLOOR, z, turn: random() * Math.PI * 2, scale });
    if (piece === "candle_triple") flames.push([x, FLOOR + height * scale + 0.1, z]);
  }

  return { bounds, pieces, flames };
}
