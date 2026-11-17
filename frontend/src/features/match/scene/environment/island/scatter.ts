import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import type { Placed } from "../shared/Instances";
import { hidesTiles, TRAIL_GROUND, type Blocker } from "../shared/trailPlan";
import { groundAt, RIVER_HALF_WIDTH, riverDistance, trailDistance, TRAIL_EARTH, type IslandShape } from "./terrain";
import { itemAt } from "@/features/shared/collections/items";
import type { LampPool } from "../shared/lampGlow";

/** A lamp post by the trail every this many tiles, and a bench every this many. */
const LANTERN_EVERY = 4;
const BENCH_STEP = 9;

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

/** How far from the trail's middle a lamp post stands: on the road's edge, just past the slabs' kerbs. */
const KERB_OFFSET = 1.75;
/** How far its lamp hangs out over the road on the post's arm (see Furniture LAMP_AT). */
export const LAMP_REACH = 0.29;
/** A post keeps this far from every other stretch of the winding trail, so it never stands on the next row. */
const POST_CLEARANCE = 2.3;

/** A lamp post: where it stands, which way it turns (its arm out over the road), and where its light falls. */
export interface LanternSpot {
  at: Vec3;
  turn: number;
  pool: LampPool;
}

/**
 * Lamp posts every LANTERN_EVERY tiles along the road's edge, like a lit road someone laid: on its far side
 * from the camera where there's room, so they never stand between the camera and the slabs; none over the stream.
 */
export function lanternSpots(trail: readonly Vec3[], shape: IslandShape): LanternSpot[] {
  const spots: LanternSpot[] = [];
  for (let index = 2; index < trail.length - 1; index += LANTERN_EVERY) {
    const [x, , z] = itemAt(trail, index);
    const [px, , pz] = itemAt(trail, index - 1);
    const [nx, , nz] = itemAt(trail, index + 1);
    const [dx, dz] = [nx - px, nz - pz];
    const length = Math.hypot(dx, dz) || 1;
    const [ox, oz] = [-dz / length, dx / length];
    const sides = [1, -1]
      .map((side) => ({ side, sx: x + ox * side * KERB_OFFSET, sz: z + oz * side * KERB_OFFSET }))
      .sort((a, b) => a.sz - b.sz);
    const free = sides.find(
      ({ sx, sz }) =>
        riverDistance(shape, sx, sz) > RIVER_HALF_WIDTH + 1 &&
        trail.every(
          ([tx, , tz], other) => Math.abs(other - index) <= 2 || Math.hypot(tx - sx, tz - sz) > POST_CLEARANCE,
        ),
    );
    if (!free) continue;
    // From the post towards the road's middle: the arm and its lamp reach that way.
    const [tx, tz] = [-ox * free.side, -oz * free.side];
    spots.push({
      at: [free.sx, TRAIL_GROUND, free.sz],
      turn: Math.atan2(tz, -tx),
      pool: {
        x: free.sx + tx * (LAMP_REACH + 0.35),
        z: free.sz + tz * (LAMP_REACH + 0.35),
        along: Math.atan2(dz, dx),
      },
    });
  }
  return spots;
}

/** How far a bench keeps from every tile centre (tiles are 2 wide, plus room for a figure beside them). */
const BENCH_CLEARANCE = 2.9;

/** Benches set back from the trail, facing it, never on the road. */
export function benchSpots(trail: readonly Vec3[], shape: IslandShape, every: number): { at: Vec3; turn: number }[] {
  const benches: { at: Vec3; turn: number }[] = [];
  for (let index = 4 + BENCH_STEP; index < trail.length - 1; index += BENCH_STEP * every) {
    const [x, , z] = itemAt(trail, index);
    const [nx, , nz] = itemAt(trail, index + 1);
    const [dx, dz] = [nx - x, nz - z];
    const length = Math.hypot(dx, dz) || 1;
    const side = index % 2 === 0 ? 1 : -1;
    const [ox, oz] = [(-dz / length) * side, (dx / length) * side];
    // A step along the trail too, so it sits beside the lantern rather than behind it.
    const at: Vec3 = [x + ox * 3.6 + (dx / length) * 1.2, TRAIL_GROUND, z + oz * 3.6 + (dz / length) * 1.2];
    // The trail winds: a bench clear of this stretch can still sit on the next bend.
    const clear = trail.every(([tx, , tz]) => Math.hypot(tx - at[0], tz - at[2]) > BENCH_CLEARANCE);
    if (clear && riverDistance(shape, at[0], at[2]) > RIVER_HALF_WIDTH + 1.5)
      benches.push({ at, turn: Math.atan2(-ox, -oz) });
  }
  return benches;
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
