import { CASTLE_FROM, VILLAGE_UNTIL } from "./terrain";

/** World units per KayKit unit: a cottage comes out a little taller than a figure. */
export const KIT_SCALE = 2.6;

/** A KayKit piece (a node of kaykit.glb): its size in kit units (width, height, depth). */
export interface Piece {
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

/** What each stretch of the trail passes through, by how far along it is (0 the start, 1 the finish). */
export const REGIONS: readonly { until: number; pieces: readonly [PieceId, number][]; density: number }[] = [
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
export const ONCE: ReadonlySet<PieceId> = new Set([
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
export const CAPS: Partial<Record<PieceId, number>> = {
  tent: 6,
  resource_lumber: 3,
  building_well_blue: 2,
  building_stage_A: 1,
};
/** Odds and ends left round a house. */
export const CLUTTER: readonly PieceId[] = [
  "barrel",
  "crate_A_big",
  "crate_B_small",
  "sack",
  "bucket_water",
  "wheelbarrow",
];
