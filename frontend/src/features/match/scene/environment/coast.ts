import { seededRandom } from "@/game/domain/random";
import type { Vec3 } from "../boardLayout";
import {
  groundAt,
  riverX,
  trailNearest,
  TRAIL_EARTH,
  VILLAGE_UNTIL,
  CASTLE_FROM,
  WATER_LEVEL,
  type IslandShape,
} from "./islandTerrain";
import type { Settlements } from "./settlements";

/** A Kenney piece (a node of kenney.glb) set down: `scale` is its whole scale in world units. */
export interface KitPlacement {
  piece: string;
  x: number;
  y: number;
  z: number;
  turn: number;
  scale: number;
}

/** Nature Kit pieces come small: this brings a bush to about knee height on a figure. */
const NATURE_SCALE = 2.4;
/** Pirate Kit pieces come big: this brings a ship to a few tiles long. */
const PIRATE_SCALE = 0.4;
const BUSHES = ["plant_bushDetailed", "plant_bush", "plant_bushLarge"];
const BOULDERS = ["rock_largeA", "rock_largeC", "rock_largeE", "rock_tallC"];
const SHORE_ROCKS = ["rocks-sand-a", "rocks-sand-b", "rocks-sand-c"];

/** Points round the waterline, `count` of them, walking out from the middle until the ground meets the sea. */
function shoreline(shape: IslandShape, count: number): { x: number; z: number; angle: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const [cx, cz] = [Math.cos(angle), Math.sin(angle)];
    let reach = 0;
    const limit = Math.max(shape.halfWidth, shape.halfDepth) * 1.3;
    while (reach < limit && groundAt(shape, cx * reach, shape.centerZ + cz * reach).height > WATER_LEVEL) reach += 0.5;
    return { x: cx * reach, z: shape.centerZ + cz * reach, angle };
  });
}

/**
 * The island's edges and countryside from the Kenney kits: rocks along the waterline (none in front,
 * where they'd stand between the camera and the trail), a jetty with a rowing boat, and on land bushes,
 * boulders, fallen logs and stumps in the woods and campfires by the tents. The same every time for a board.
 */
export function planCoast(
  shape: IslandShape,
  trail: readonly Vec3[],
  town: Settlements,
  scatter: { bushes: readonly Spot[]; rocks: readonly Spot[] },
): { pieces: KitPlacement[] } {
  const random = seededRandom(83);
  const pieces: KitPlacement[] = [];
  const add = (piece: string, x: number, y: number, z: number, scale: number, turn = random() * Math.PI * 2) =>
    pieces.push({ piece, x, y, z, turn, scale });
  const frontZ = Math.max(...trail.map(([, , z]) => z));

  // Rocks breaking the waterline, every few steps round the shore, but not along the front.
  for (const { x, z } of shoreline(shape, 72)) {
    if (z > frontZ - 2 || random() < 0.45) continue;
    add(
      SHORE_ROCKS[Math.floor(random() * SHORE_ROCKS.length)],
      x,
      WATER_LEVEL - 0.3,
      z,
      PIRATE_SCALE * (0.7 + random() * 0.6),
    );
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

  // The countryside: the spots the island scattered get kit pieces.
  scatter.bushes.forEach((spot, index) =>
    add(BUSHES[index % BUSHES.length], spot.x, spot.y, spot.z, NATURE_SCALE * (0.8 + spot.size)),
  );
  scatter.rocks.forEach((spot, index) =>
    add(BOULDERS[index % BOULDERS.length], spot.x, spot.y, spot.z, NATURE_SCALE * spot.size),
  );
  // Fallen logs and stumps in the woods, along the trail's middle stretch.
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = (random() * 2 - 1) * shape.halfWidth;
    const z = shape.centerZ + (random() * 2 - 1) * shape.halfDepth;
    const { distance, along } = trailNearest(shape, x, z);
    if (along < VILLAGE_UNTIL || along > CASTLE_FROM || distance < TRAIL_EARTH + 0.5) continue;
    const { height, cover } = groundAt(shape, x, z);
    if (cover !== "grass" && cover !== "meadow") continue;
    if (town.blockers.some((blocker) => Math.hypot(blocker.x - x, blocker.z - z) < blocker.radius + 0.4)) continue;
    if (random() < 0.5) continue;
    add(random() < 0.6 ? "log" : "stump_round", x, height, z, NATURE_SCALE * (0.8 + random() * 0.4));
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

/** A spot the island scattered something on (see Island's scatterProps). */
export interface Spot {
  x: number;
  y: number;
  z: number;
  size: number;
}
