import { seededRandom } from "@/game/domain/random";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "../boardLayout";
import {
  groundAt,
  riverDistance,
  riverX,
  CASTLE_FROM,
  RIVER_HALF_WIDTH,
  trailDistance,
  VILLAGE_UNTIL,
  TRAIL_EARTH,
  WATER_LEVEL,
  type IslandShape,
} from "./islandTerrain";

/** World units per KayKit unit: a cottage comes out a little taller than a figure. */
export const KIT_SCALE = 2.6;
/** How far behind it (towards the far side) a thing of height h hides the ground, with the camera up at 45°. */
const SHADE_REACH = 1.15;

/** A KayKit piece (a node of kaykit.glb): its size in kit units (width, height, depth). */
interface Piece {
  size: [number, number, number];
  /** Puffs smoke from its chimney. */
  smokes?: boolean;
}

export const PIECES = {
  building_home_A_blue: { size: [0.79, 0.93, 0.85], smokes: true },
  building_home_B_blue: { size: [0.87, 1.28, 1.1], smokes: true },
  building_home_A_red: { size: [0.79, 0.93, 0.85], smokes: true },
  building_home_B_red: { size: [0.87, 1.28, 1.1], smokes: true },
  building_tavern_blue: { size: [1.17, 1.4, 1.33], smokes: true },
  building_tavern_red: { size: [1.17, 1.4, 1.33], smokes: true },
  building_market_blue: { size: [1.8, 0.98, 1.32] },
  building_blacksmith_blue: { size: [1.29, 0.99, 1.25], smokes: true },
  building_well_blue: { size: [0.65, 0.83, 0.75] },
  building_windmill_blue: { size: [1.13, 1.46, 0.82] },
  building_church_blue: { size: [1.03, 1.65, 1.15] },
  building_watermill_blue: { size: [1.05, 1.57, 1.24] },
  building_lumbermill_blue: { size: [1.37, 1.71, 1.19] },
  building_tower_A_blue: { size: [0.99, 2.19, 1.15] },
  building_castle_blue: { size: [1.98, 3.98, 2.26] },
  building_archeryrange_blue: { size: [1.67, 1.79, 1.55] },
  building_grain: { size: [1.87, 0.39, 2.09] },
  building_stage_A: { size: [1.05, 0.29, 0.87] },
  fence_wood_straight: { size: [0.1, 0.55, 1.15] },
  wall_straight: { size: [2, 1.1, 0.8] },
  wall_straight_gate: { size: [2, 1.41, 0.9] },
  wall_corner_A_outside: { size: [1.76, 1.1, 1.43] },
  tree_single_A: { size: [0.57, 1.2, 0.55] },
  tree_single_B: { size: [0.68, 1.21, 0.72] },
  trees_A_medium: { size: [1.75, 1.3, 1.81] },
  trees_B_medium: { size: [1.86, 1.17, 1.83] },
  trees_A_large: { size: [1.95, 0.93, 1.97] },
  rock_single_A: { size: [0.3, 0.07, 0.28] },
  rock_single_B: { size: [0.29, 0.13, 0.25] },
  rock_single_C: { size: [0.34, 0.19, 0.34] },
  waterlily_A: { size: [0.15, 0.02, 0.14] },
  barrel: { size: [0.2, 0.21, 0.2] },
  crate_A_big: { size: [0.21, 0.21, 0.21] },
  crate_B_small: { size: [0.14, 0.14, 0.14] },
  sack: { size: [0.11, 0.06, 0.16] },
  wheelbarrow: { size: [0.24, 0.19, 0.51] },
  tent: { size: [0.52, 0.52, 0.52] },
  flag_blue: { size: [0.06, 0.28, 0.26] },
  flag_red: { size: [0.06, 0.28, 0.26] },
  resource_lumber: { size: [0.69, 0.21, 0.33] },
  weaponrack: { size: [0.2, 0.24, 0.13] },
  bucket_water: { size: [0.14, 0.1, 0.14] },
} as const satisfies Record<string, Piece>;
export type PieceId = keyof typeof PIECES;

/** One piece set down on the island. */
export interface Placement {
  piece: PieceId;
  x: number;
  y: number;
  z: number;
  turn: number;
  /** Its own scale on top of KIT_SCALE (the castle is drawn smaller). */
  scale: number;
}

/** What each stretch of the trail passes through, by how far along it is (0 the start, 1 the finish). */
const REGIONS: readonly { until: number; pieces: readonly [PieceId, number][]; density: number }[] = [
  {
    // The village the race sets out from.
    until: VILLAGE_UNTIL,
    density: 1,
    pieces: [
      ["building_home_A_blue", 5],
      ["building_home_B_blue", 4],
      ["building_home_A_red", 4],
      ["building_home_B_red", 3],
      ["building_tavern_red", 1],
      ["building_market_blue", 1],
      ["building_blacksmith_blue", 1],
      ["building_well_blue", 1],
      ["building_church_blue", 1],
      ["building_windmill_blue", 1],
      ["building_grain", 4],
      ["building_stage_A", 1],
    ],
  },
  {
    // Woods with a woodcutters' camp and an archery range.
    until: CASTLE_FROM,
    density: 0.8,
    pieces: [
      ["trees_A_medium", 4],
      ["trees_B_medium", 4],
      ["trees_A_large", 3],
      ["tree_single_A", 3],
      ["tree_single_B", 3],
      ["building_lumbermill_blue", 1],
      ["building_archeryrange_blue", 1],
      ["tent", 3],
      ["resource_lumber", 2],
    ],
  },
  {
    // The castle grounds by the finish.
    until: 1,
    density: 0.8,
    pieces: [
      ["building_tower_A_blue", 2],
      ["wall_straight", 3],
      ["wall_straight_gate", 1],
      ["wall_corner_A_outside", 2],
      ["building_tavern_blue", 1],
      ["building_home_B_blue", 2],
      ["building_grain", 2],
      ["tent", 2],
    ],
  },
];
/** Built at most once on a board. */
const ONCE: ReadonlySet<PieceId> = new Set([
  "building_church_blue",
  "building_windmill_blue",
  "building_market_blue",
  "building_blacksmith_blue",
  "building_lumbermill_blue",
  "building_archeryrange_blue",
  "building_tavern_red",
  "building_tavern_blue",
]);
/** At most this many of a small piece, which would otherwise fill every gap. */
const CAPS: Partial<Record<PieceId, number>> = {
  tent: 6,
  resource_lumber: 3,
  building_well_blue: 2,
  building_stage_A: 1,
};
/** Odds and ends left round a house. */
const CLUTTER: readonly PieceId[] = ["barrel", "crate_A_big", "crate_B_small", "sack", "bucket_water", "wheelbarrow"];

/** What the settlements leave room for: each placement's centre and reach, for the woods to keep clear of. */
export interface Settlements {
  placements: Placement[];
  blockers: { x: number; z: number; radius: number }[];
  /** Chimneys, in world space. */
  chimneys: Vec3[];
}

/**
 * The village, the woodcutters' camp and the castle grounds the trail runs through, a watermill on
 * the stream and the castle by the finish. Nothing stands on the road, in the stream, or where it
 * would hide a tile behind it from the camera. The same every time for a board.
 */
export function planSettlements(shape: IslandShape, trail: readonly Vec3[]): Settlements {
  const random = seededRandom(57);
  const placements: Placement[] = [];
  const blockers: Settlements["blockers"] = [];
  const chimneys: Vec3[] = [];
  const built = new Set<PieceId>();

  const footprint = (piece: PieceId, scale = 1) =>
    (Math.max(PIECES[piece].size[0], PIECES[piece].size[2]) / 2) * KIT_SCALE * scale;
  const heightOf = (piece: PieceId, scale = 1) => PIECES[piece].size[1] * KIT_SCALE * scale;
  const hidesTiles = (x: number, z: number, height: number, spread: number) =>
    trail.some(([tx, , tz]) => tz < z + 1 && z - tz < height * SHADE_REACH && Math.abs(tx - x) < spread + 1.4);
  const nearestTile = (x: number, z: number) => {
    let best = 0;
    let distance = Infinity;
    trail.forEach(([tx, , tz], index) => {
      const d = Math.hypot(tx - x, tz - z);
      if (d < distance) [best, distance] = [index, d];
    });
    return best;
  };
  /** The ground under the piece if it's fit to build on: dry, green, near level; else null. */
  const site = (x: number, z: number, radius: number) => {
    const corners = [
      [x - radius, z - radius],
      [x + radius, z - radius],
      [x - radius, z + radius],
      [x + radius, z + radius],
      [x, z],
    ].map(([cx, cz]) => groundAt(shape, cx, cz));
    if (corners.some(({ cover }) => cover !== "grass" && cover !== "meadow" && cover !== "earth" && cover !== "paving"))
      return null;
    const heights = corners.map(({ height }) => height);
    if (Math.max(...heights) - Math.min(...heights) > 0.5) return null;
    return Math.min(...heights);
  };
  const free = (x: number, z: number, radius: number) =>
    blockers.every((other) => Math.hypot(other.x - x, other.z - z) > other.radius + radius + 0.3);
  const facingTrail = (x: number, z: number) => {
    const [tx, , tz] = trail[nearestTile(x, z)];
    return Math.atan2(tx - x, tz - z);
  };
  const place = (piece: PieceId, x: number, y: number, z: number, turn: number, scale = 1) => {
    placements.push({ piece, x, y, z, turn, scale });
    blockers.push({ x, z, radius: footprint(piece, scale) });
    if (ONCE.has(piece)) built.add(piece);
    const look: Piece = PIECES[piece];
    if (look.smokes) {
      const [width, height] = look.size;
      chimneys.push([
        x + Math.cos(turn) * width * 0.22 * KIT_SCALE,
        y + height * 0.95 * KIT_SCALE * scale,
        z - Math.sin(turn) * width * 0.22 * KIT_SCALE,
      ]);
    }
  };
  const tryPlace = (piece: PieceId, x: number, z: number, scale = 1) => {
    const radius = footprint(piece, scale);
    const clear = Math.min(
      trailDistance(shape, x, z) - TRAIL_EARTH - 0.4,
      riverDistance(shape, x, z) - RIVER_HALF_WIDTH - 0.6,
    );
    if (clear < radius || !free(x, z, radius) || hidesTiles(x, z, heightOf(piece, scale), radius)) return false;
    const y = site(x, z, radius * 0.7);
    if (y === null) return false;
    place(piece, x, y - 0.05, z, facingTrail(x, z), scale);
    return true;
  };

  // The village gate the race sets out from, across the road just behind the start's plaza.
  if (trail.length > 1) {
    const [sx, , sz] = trail[0];
    const [dx, dz] = [trail[1][0] - sx, trail[1][2] - sz];
    const length = Math.hypot(dx, dz) || 1;
    const back = TILE_PITCH * 0.5 + START_PLAZA + 0.7;
    const [gx, gz] = [sx - (dx / length) * back, sz - (dz / length) * back];
    place("wall_straight_gate", gx, groundAt(shape, gx, gz).height - 0.05, gz, Math.atan2(dx, dz));
  }

  // The castle first: beside the finish, as close as it can stand without hiding the way.
  const [fx, , fz] = trail.at(-1) ?? [0, 0, 0];
  for (let attempt = 0; attempt < 400; attempt++) {
    const angle = random() * Math.PI * 2;
    const reach = 5 + (attempt / 400) * 14;
    if (tryPlace("building_castle_blue", fx + Math.cos(angle) * reach, fz + Math.sin(angle) * reach, 0.5)) break;
  }
  // The watermill on the stream's bank, wherever along it there's room (behind the trail or in front of it, mostly).
  for (let attempt = 0; attempt < 600; attempt++) {
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const side = random() < 0.5 ? -1 : 1;
    const x = riverX(shape, z) + side * (RIVER_HALF_WIDTH + 1.4);
    const radius = footprint("building_watermill_blue", 0.8);
    if (trailDistance(shape, x, z) - TRAIL_EARTH < radius + 0.4 || !free(x, z, radius)) continue;
    if (hidesTiles(x, z, heightOf("building_watermill_blue", 0.8), radius)) continue;
    const { height, cover } = groundAt(shape, x, z);
    if (cover === "sand" || cover === "rock" || cover === "snow" || height < WATER_LEVEL + 0.3) continue;
    // Its wheel turned to the water.
    place("building_watermill_blue", x, height - 0.1, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0.8);
    break;
  }

  const area = shape.halfWidth * shape.halfDepth * 4;
  for (let attempt = Math.round(area * 2); attempt > 0; attempt--) {
    const x = (random() * 2 - 1) * shape.halfWidth;
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const along = nearestTile(x, z) / Math.max(1, trail.length - 1);
    const region = REGIONS.find(({ until }) => along <= until) ?? REGIONS[REGIONS.length - 1];
    if (random() > region.density) continue;
    const pieces = region.pieces.filter(
      ([piece]) =>
        !built.has(piece) && placements.filter((other) => other.piece === piece).length < (CAPS[piece] ?? Infinity),
    );
    const total = pieces.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = random() * total;
    const piece = pieces.find(([, weight]) => (roll -= weight) < 0)?.[0];
    if (!piece || !tryPlace(piece, x, z)) continue;
    // A house gathers a few barrels, crates and sacks at its side.
    if (
      piece.startsWith("building_home") ||
      piece.startsWith("building_tavern") ||
      piece === "building_blacksmith_blue"
    ) {
      const radius = footprint(piece);
      for (let item = Math.floor(random() * 3); item >= 0; item--) {
        const angle = random() * Math.PI * 2;
        const [cx, cz] = [x + Math.cos(angle) * (radius + 0.35), z + Math.sin(angle) * (radius + 0.35)];
        if (trailDistance(shape, cx, cz) - TRAIL_EARTH < 0.3) continue;
        const clutter = CLUTTER[Math.floor(random() * CLUTTER.length)];
        placements.push({
          piece: clutter,
          x: cx,
          y: groundAt(shape, cx, cz).height,
          z: cz,
          turn: random() * 6.3,
          scale: 1,
        });
      }
    }
  }
  return { placements, blockers, chimneys };
}
