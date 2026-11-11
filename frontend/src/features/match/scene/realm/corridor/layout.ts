import { TILE_HEIGHT, TILE_PITCH, type Vec3 } from "@/features/shared/board/boardLayout";

/** How tall the walls stand over the tiles, and how thick they are. */
export const WALL_HEIGHT = 2.6;
export const WALL_THICKNESS = 0.35;
/** A pillar or column stands a little over the walls. */
export const PILLAR_HEIGHT = WALL_HEIGHT + 0.25;
/** How far the floor reaches past the first and last tiles. */
const END_MARGIN = TILE_PITCH * 0.7;

/** Stone, trim and glow of each realm's corridor. */
export const LOOK = {
  celestial: { stone: "#eef0f6", floor: "#dfe3ee", roughness: 0.35, trim: "#f5d77a" },
  infernal: { stone: "#1c0f0c", floor: "#120806", roughness: 0.95, trim: "#ff5a14" },
} as const;

/** Where a corridor runs: its line (x), its near and far ends, and its floor's height. */
export interface CorridorSpan {
  x: number;
  near: number;
  far: number;
  length: number;
  centreZ: number;
  floorY: number;
}

/** The corridor round a track's tiles, all on one line along z (see corridorPositions). */
export function corridorSpan(positions: readonly Vec3[]): CorridorSpan {
  const [x, level] = positions[0];
  const startZ = positions[0][2];
  const endZ = positions.at(-1)![2];
  const near = Math.max(startZ, endZ) + END_MARGIN;
  const far = Math.min(startZ, endZ) - END_MARGIN;
  return { x, near, far, length: near - far, centreZ: (near + far) / 2, floorY: level - TILE_HEIGHT / 2 - 0.08 };
}

/** The depth (z) of every `every`-th tile, starting from the second: where pillars stand. */
export function everyNthDepth(positions: readonly Vec3[], every: number): number[] {
  return positions.filter((_, index) => index % every === 1).map(([, , z]) => z);
}

/** One straight run of a lava crack. */
export interface CrackSegment {
  y: number;
  z: number;
  length: number;
  tilt: number;
}

/** The straight runs of a crack zigzagging down from near the wall's top, fixed by `seed`. */
export function crackSegments(seed: number): CrackSegment[] {
  const segments: CrackSegment[] = [];
  let y = WALL_HEIGHT * 0.9;
  let z = 0;
  for (let index = 0; index < 5; index++) {
    const length = 0.35 + ((seed * 7 + index * 3) % 5) * 0.06;
    const tilt = ((seed + index) % 2 === 0 ? 1 : -1) * (0.35 + ((index * 5 + seed) % 3) * 0.15);
    segments.push({ y: y - (length / 2) * Math.cos(tilt), z: z + (length / 2) * Math.sin(tilt), length, tilt });
    y -= length * Math.cos(tilt);
    z += length * Math.sin(tilt);
  }
  return segments;
}
