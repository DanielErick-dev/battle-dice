import type { CharacterId } from "@/features/characters";
import type { PropId } from "@/features/characters/core/props";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { hidesTiles, isFree, type Blocker } from "../shared/trailPlan";
import {
  groundAt,
  riverDistance,
  trailDistance,
  RIVER_HALF_WIDTH,
  TRAIL_EARTH,
  WATER_LEVEL,
  type IslandShape,
} from "./terrain";

/** Each character's landmark on the island: a piece of their world (menu habitat props), and how tall it stands. */
export const LANDMARKS: Readonly<Record<CharacterId, { prop: PropId; height: number }>> = {
  zarek: { prop: "voidWraith", height: 3 },
  enchantress: { prop: "roseCandelabra", height: 2.4 },
  witch: { prop: "witchCauldron", height: 1.5 },
  alchemist: { prop: "alchemyCauldron", height: 1.7 },
  monk: { prop: "stormThrone", height: 2.4 },
  archer: { prop: "archerTarget", height: 2.2 },
  jester: { prop: "jesterThrone", height: 2.4 },
  necromancer: { prop: "gravestone", height: 1.7 },
  scribe: { prop: "scribeThrone", height: 2.4 },
  warden: { prop: "shadowThrone", height: 2.4 },
  kage: { prop: "kageStage", height: 3.2 },
  fairy: { prop: "frostThrone", height: 2.4 },
  zephyr: { prop: "elementalThrone", height: 2.4 },
  themis: { prop: "greekColumn", height: 3.4 },
  akane: { prop: "akaneLantern", height: 2.2 },
  bjorn: { prop: "bjornCrystal", height: 2.4 },
  auric: { prop: "auricCoral", height: 2.2 },
  seraphiel: { prop: "celestialThrone", height: 2.6 },
  cronos: { prop: "cronosGlobe", height: 2.2 },
  alva: { prop: "hangarCore", height: 2.4 },
  vinicius: { prop: "viniciusGarden", height: 1.2 },
};

/** How much ground a landmark keeps to itself, and how far off the trail's edge it may stand. */
export const LANDMARK_RADIUS = 1.1;
// The trail winds in close rows: past the first few, a site may sit in the gap between two of them.
const SIDE_DISTANCES = [3, 3.6, 4.4, 5.4, 6.6, 8, 9.5, 11, 12.5];
/** Tiles to shift along the trail, in order, when its own stretch has no room. */
const ALONG_SHIFTS = Array.from({ length: 61 }, (_, step) => (step % 2 ? (step + 1) / 2 : -step / 2));

export interface LandmarkSpot {
  character: CharacterId;
  x: number;
  y: number;
  z: number;
  /** Facing the trail. */
  turn: number;
}

/**
 * A fixed spot for every character's landmark, spread along the trail in roster order and kept off the tiles,
 * the river, the houses and each other; planned for all of them so a character's spot never depends on who else
 * plays. Sites behind the trail (away from the camera) come first, so nothing hides a tile.
 */
export function planLandmarks(
  shape: IslandShape,
  trail: readonly Vec3[],
  blockers: readonly Blocker[],
  characters: readonly CharacterId[],
): LandmarkSpot[] {
  const taken: Blocker[] = [...blockers];
  const spots: LandmarkSpot[] = [];
  characters.forEach((character, order) => {
    const base = Math.round(((order + 0.5) / characters.length) * (trail.length - 1));
    const { height } = LANDMARKS[character];
    for (const shift of ALONG_SHIFTS) {
      const spot = siteNear(shape, trail, taken, base + shift, height);
      if (!spot) continue;
      taken.push({ x: spot.x, z: spot.z, radius: LANDMARK_RADIUS });
      spots.push({ character, ...spot });
      return;
    }
  });
  return spots;
}

function siteNear(
  shape: IslandShape,
  trail: readonly Vec3[],
  taken: readonly Blocker[],
  index: number,
  height: number,
) {
  const here = trail[index];
  if (!here) return null;
  const [before, after] = [trail[index - 1] ?? here, trail[index + 1] ?? here];
  const [dx, dz] = [after[0] - before[0], after[2] - before[2]];
  const length = Math.hypot(dx, dz) || 1;
  // Both sides across the way, the one further from the camera (lower z) first.
  const sides = [
    [dz / length, -dx / length],
    [-dz / length, dx / length],
  ].sort((a, b) => a[1]! - b[1]!);
  for (const distance of SIDE_DISTANCES) {
    for (const [sx, sz] of sides) {
      const [x, z] = [here[0] + sx! * distance, here[2] + sz! * distance];
      const ground = groundAt(shape, x, z).height;
      if (ground < WATER_LEVEL + 0.3) continue;
      if (trailDistance(shape, x, z) - TRAIL_EARTH < LANDMARK_RADIUS) continue;
      if (riverDistance(shape, x, z) < RIVER_HALF_WIDTH + LANDMARK_RADIUS) continue;
      if (!isFree(taken, x, z, LANDMARK_RADIUS, 0.4)) continue;
      if (hidesTiles(trail, x, z, height, LANDMARK_RADIUS)) continue;
      return { x, y: ground, z, turn: Math.atan2(here[0] - x, here[2] - z) };
    }
  }
  return null;
}
