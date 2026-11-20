import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import {
  groundAt,
  riverX,
  trailNearest,
  TRAIL_EARTH,
  VILLAGE_UNTIL,
  CASTLE_FROM,
  WATER_LEVEL,
  type IslandShape,
} from "./terrain";
import type { KitItem } from "../shared/kits";
import type { Settlements } from "./settlements";
import { cycle, pick } from "@/features/shared/collections/items";

/** Nature Kit pieces come small: this brings a bush to about knee height on a figure. */
const NATURE_SCALE = 2.4;
/** Pirate Kit pieces come big: this brings a ship to a few tiles long. */
const PIRATE_SCALE = 0.4;
const BUSHES = ["plant_bushDetailed", "plant_bush", "plant_bushLarge"];
const BOULDERS = [
  "rock_largeA",
  "rocks_mossy",
  "rock_largeC",
  "rocks_mossy",
  "rock_largeE",
  "rocks_mossy",
  "rock_tallC",
];
const SHORE_ROCKS = ["rocks-sand-a", "rocks-sand-b", "rocks-sand-c"];
/** What each of ten bush spots becomes: one in ten left bare, most of the rest something other than a bush. */
const BUSH_VARIETY = [
  "none",
  "flowers",
  "bush",
  "rock_small",
  "bush",
  "tree_young",
  "glowcaps",
  "flowers",
  "bush",
  "bush",
];
/** A few flowers round a spot: offsets and sizes. */
const FLOWER_CLUSTER: readonly [number, number, number][] = [
  [0, 0, 1],
  [0.45, 0.3, 0.75],
  [-0.35, 0.4, 0.6],
];

/** Where round the island (radians, 0 = east, π/2 = towards the camera) the fishing boats lie at anchor. */
const BOAT_ANGLES = [0.1, 0.55, 1.15, 1.95, 2.6, 3.05];

/** Points round the waterline, `count` of them, walking out from the middle until the ground meets the sea. */
export function shoreline(shape: IslandShape, count: number): { x: number; z: number; angle: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const [cx, cz] = [Math.cos(angle), Math.sin(angle)];
    let reach = 0;
    const limit = Math.max(shape.halfWidth, shape.halfDepth) * 1.3;
    while (reach < limit && groundAt(shape, cx * reach, shape.centerZ + cz * reach).height > WATER_LEVEL) reach += 0.5;
    return { x: cx * reach, z: shape.centerZ + cz * reach, angle };
  });
}

/** No rocks in front, where they'd stand between the camera and the trail; seeded per board. */
export function planCoast(
  shape: IslandShape,
  trail: readonly Vec3[],
  town: Settlements,
  scatter: { bushes: readonly Spot[]; rocks: readonly Spot[] },
): { pieces: KitItem[] } {
  const random = seededRandom(83);
  const pieces: KitItem[] = [];
  const add = (piece: string, x: number, y: number, z: number, scale: number, turn = random() * Math.PI * 2) =>
    pieces.push({ piece, x, y, z, turn, scale });
  const frontZ = Math.max(...trail.map(([, , z]) => z));

  // Rocks breaking the waterline, every few steps round the shore, but not along the front.
  for (const { x, z } of shoreline(shape, 72)) {
    if (z > frontZ - 2 || random() < 0.45) continue;
    add(pick(SHORE_ROCKS, random()), x, WATER_LEVEL - 0.3, z, PIRATE_SCALE * (0.7 + random() * 0.6));
  }
  // A jetty off the front corner, a rowing boat moored beside it.
  const jetty = shoreline(shape, 36).find(({ angle }) => angle > Math.PI * 0.15 && angle < Math.PI * 0.3);
  if (jetty) {
    const turn = Math.atan2(Math.cos(jetty.angle), Math.sin(jetty.angle));
    for (let plank = 0; plank < 3; plank++) {
      const out = plank * 2.5 * 0.6;
      add(
        "structure-platform-dock",
        jetty.x + Math.cos(jetty.angle) * out,
        WATER_LEVEL - 0.15,
        jetty.z + Math.sin(jetty.angle) * out,
        0.6,
        turn,
      );
    }
    add(
      "boat-row-small",
      jetty.x + Math.cos(jetty.angle) * 2.4 + Math.sin(jetty.angle) * 1.6,
      WATER_LEVEL - 0.05,
      jetty.z + Math.sin(jetty.angle) * 2.4 - Math.cos(jetty.angle) * 1.6,
      0.6,
      turn + 0.3,
    );
  }

  // Fishing boats riding at anchor round the front and the sides, a little way out from the beach, where they show.
  for (const angle of BOAT_ANGLES) {
    const shore = shoreline(shape, 72).reduce((best, spot) =>
      Math.abs(spot.angle - angle) < Math.abs(best.angle - angle) ? spot : best,
    );
    const out = 3 + random() * 2;
    add(
      "boat-row-small",
      shore.x + Math.cos(shore.angle) * out,
      WATER_LEVEL - 0.05,
      shore.z + Math.sin(shore.angle) * out,
      0.6,
    );
  }
  // The countryside: the spots the island scattered get kit pieces, the bushes mixed with flowers, stones and saplings.
  scatter.bushes.forEach((spot, index) => {
    const scale = NATURE_SCALE * (0.8 + spot.size);
    const variety = cycle(BUSH_VARIETY, index);
    if (variety === "bush") add(cycle(BUSHES, index), spot.x, spot.y, spot.z, scale);
    else if (variety === "flowers") {
      const flower = index % 4 < 2 ? "flower_shadow" : "flower_nebula";
      FLOWER_CLUSTER.forEach(([dx, dz, size]) => add(flower, spot.x + dx, spot.y, spot.z + dz, scale * size));
    } else if (variety !== "none") add(variety, spot.x, spot.y, spot.z, scale);
  });
  scatter.rocks.forEach((spot, index) => add(cycle(BOULDERS, index), spot.x, spot.y, spot.z, NATURE_SCALE * spot.size));
  // Mossy fallen logs and dead trees in the woods, along the trail's middle stretch.
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = (random() * 2 - 1) * shape.halfWidth;
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const { distance, along } = trailNearest(shape, x, z);
    if (along < VILLAGE_UNTIL || along > CASTLE_FROM || distance < TRAIL_EARTH + 0.5) continue;
    const { height, cover } = groundAt(shape, x, z);
    if (cover !== "grass" && cover !== "meadow") continue;
    if (town.blockers.some((blocker) => Math.hypot(blocker.x - x, blocker.z - z) < blocker.radius + 0.4)) continue;
    if (random() < 0.5) continue;
    add(random() < 0.6 ? "log" : "tree_dead", x, height, z, NATURE_SCALE * (0.8 + random() * 0.4));
  }
  // A campfire before every tent.
  for (const tent of town.placements.filter(({ piece }) => piece === "tent")) {
    const [fx, fz] = [tent.x + Math.sin(tent.turn) * 1.3, tent.z + Math.cos(tent.turn) * 1.3];
    add("campfire_logs", fx, groundAt(shape, fx, fz).height, fz, NATURE_SCALE);
  }
  // An arched footbridge over the stream away from the trail.
  for (let attempt = 0; attempt < 300; attempt++) {
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const x = riverX(shape, z);
    if (trailNearest(shape, x, z).distance < 5) continue;
    if (trail.some(([tx, , tz]) => tz < z + 1 && z - tz < 3 && Math.abs(tx - x) < 4)) continue;
    const bank = groundAt(shape, x + 3, z).height;
    if (bank < WATER_LEVEL + 0.3 || groundAt(shape, x - 3, z).height < WATER_LEVEL + 0.3) continue;
    add("bridge_woodRound", x, Math.min(bank, groundAt(shape, x - 3, z).height) - 0.1, z, 5, 0);
    break;
  }

  return { pieces };
}

/** A spot the island scattered something on (see scatter.ts). */
export interface Spot {
  x: number;
  y: number;
  z: number;
  size: number;
}
