import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import type { Placed } from "../shared/Instances";
import { hidesTiles, TRAIL_GROUND, type Blocker } from "../shared/trailPlan";
import { groundAt, RIVER_HALF_WIDTH, riverDistance, trailDistance, TRAIL_EARTH, type IslandShape } from "./terrain";
import { itemAt } from "@/features/shared/collections/items";

/** A lantern by the trail every this many tiles. */
const LANTERN_EVERY = 9;

/** Big pines, at most: each a heavy model, so the woods stay light. */
const MAX_PINES = 90;

/**
 * Pines and rocky knolls full size, only where no tile hides behind them (the camera looks from the
 * front); bushes in their place between the rows; boulders and tufts. The same every time for a board.
 */
export function scatterProps(shape: IslandShape, trail: readonly Vec3[], blockers: readonly Blocker[]) {
  const random = seededRandom(31);
  const trees: Placed[] = [];
  const groves: Placed[] = [];
  const bushes: Placed[] = [];
  const rocks: Placed[] = [];
  const tufts: Placed[] = [];
  const area = shape.halfWidth * shape.halfDepth * 4;
  const spot = () => {
    const x = (random() * 2 - 1) * shape.halfWidth;
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const { height, cover } = groundAt(shape, x, z);
    const clear = Math.min(
      trailDistance(shape, x, z) - TRAIL_EARTH,
      riverDistance(shape, x, z) - RIVER_HALF_WIDTH - 0.8,
      // Off the houses, walls and fields.
      ...blockers.map((blocker) => Math.hypot(blocker.x - x, blocker.z - z) - blocker.radius),
    );
    return { x, z, height, cover, clear };
  };
  const placed = (x: number, y: number, z: number, size: number): Placed => ({
    x,
    y,
    z,
    size,
    turn: random() * Math.PI * 2,
    tilt: 0,
  });

  for (let attempt = Math.round(area * 0.6); attempt > 0; attempt--) {
    const { x, z, height, cover, clear } = spot();
    if (clear < 0.6 || cover === "sand" || cover === "snow" || cover === "earth" || cover === "bank") continue;
    const roll = random();
    const item = placed(x, height - 0.05, z, 0.7 + random() * 0.7);
    if (cover === "rock") {
      if (roll < 0.25) rocks.push({ ...item, size: item.size * 1.6 });
      continue;
    }
    if (roll < 0.55) {
      const tall = 5.5 + random() * 3;
      const grove = roll < 0.06;
      const size = grove ? tall * 0.75 : tall;
      // Its crown spreads about a third of its height each way.
      const spread = size * (grove ? 0.5 : 0.35);
      if (clear > spread && !hidesTiles(trail, x, z, size, spread) && (grove || trees.length < MAX_PINES)) {
        (grove ? groves : trees).push({ ...item, size });
      } else if (clear > 0.8) bushes.push({ ...item, size: 0.5 + random() * 0.5 });
    } else if (roll < 0.63) rocks.push({ ...item, tilt: random() * 0.6 });
  }
  // Grass in tufts everywhere green, right up to the trail's edge.
  for (let attempt = Math.min(5000, Math.round(area * 2.2)); attempt > 0; attempt--) {
    const { x, z, height, cover, clear } = spot();
    if (clear < -0.25 || (cover !== "grass" && cover !== "meadow")) continue;
    tufts.push(placed(x, height, z, 0.6 + random() * 0.8));
  }
  return { trees, groves, bushes, rocks, tufts };
}

/** Beside the trail every LANTERN_EVERY tiles, on alternate sides; none over the stream. */
export function lanternSpots(trail: readonly Vec3[], shape: IslandShape): Vec3[] {
  const spots: Vec3[] = [];
  for (let index = 4; index < trail.length - 1; index += LANTERN_EVERY) {
    const [x, , z] = itemAt(trail, index);
    const [nx, , nz] = itemAt(trail, index + 1);
    const [dx, dz] = [nx - x, nz - z];
    const length = Math.hypot(dx, dz) || 1;
    const side = index % 2 === 0 ? 1 : -1;
    const spot: Vec3 = [x - (dz / length) * 2 * side, TRAIL_GROUND, z + (dx / length) * 2 * side];
    if (riverDistance(shape, spot[0], spot[2]) > RIVER_HALF_WIDTH + 1) spots.push(spot);
  }
  return spots;
}

/** One stretch of the trail over the stream: the tiles' centres it runs between. */
export interface BridgeSpan {
  from: Vec3;
  to: Vec3;
}

/** Every step of the trail that crosses the stream, and the ones onto and off it. */
export function bridgeSpans(trail: readonly Vec3[], shape: IslandShape): BridgeSpan[] {
  return trail.slice(1).flatMap((to, index) => {
    const from = itemAt(trail, index);
    const middle = riverDistance(shape, (from[0] + to[0]) / 2, (from[2] + to[2]) / 2);
    return middle < RIVER_HALF_WIDTH + 1.3 ? [{ from, to }] : [];
  });
}
