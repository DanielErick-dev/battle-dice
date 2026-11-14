import { seededRandom } from "@/game/domain/core/random";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "@/features/shared/board/boardLayout";
import { footprint as footprintOf, hidesTiles, isFree, pickWeighted, type Blocker } from "../shared/trailPlan";
import {
  groundAt,
  riverDistance,
  riverX,
  RIVER_HALF_WIDTH,
  trailDistance,
  TRAIL_EARTH,
  WATER_LEVEL,
  type IslandShape,
} from "./terrain";
import { CAPS, CLUTTER, KIT_SCALE, ONCE, PIECES, REGIONS, type Piece, type PieceId } from "./townPieces";
import { itemAt, pick } from "@/features/shared/collections/items";

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

/** What the settlements leave room for: each placement's centre and reach, for the woods to keep clear of. */
export interface Settlements {
  placements: Placement[];
  blockers: Blocker[];
  /** Chimneys, in world space. */
  chimneys: Vec3[];
}

const footprint = (piece: PieceId, scale = 1) => footprintOf(PIECES[piece].size, KIT_SCALE) * scale;
const heightOf = (piece: PieceId, scale = 1) => PIECES[piece].size[1] * KIT_SCALE * scale;

/** The index of the tile nearest a point. */
function nearestTile(trail: readonly Vec3[], x: number, z: number): number {
  let best = 0;
  let distance = Infinity;
  trail.forEach(([tx, , tz], index) => {
    const d = Math.hypot(tx - x, tz - z);
    if (d < distance) [best, distance] = [index, d];
  });
  return best;
}

/** The ground under a piece if it's fit to build on: dry, green, near level; else null. */
function buildingSite(shape: IslandShape, x: number, z: number, radius: number): number | null {
  const corners = (
    [
      [x - radius, z - radius],
      [x + radius, z - radius],
      [x - radius, z + radius],
      [x + radius, z + radius],
      [x, z],
    ] as const
  ).map(([cx, cz]) => groundAt(shape, cx, cz));
  if (corners.some(({ cover }) => cover !== "grass" && cover !== "meadow" && cover !== "earth" && cover !== "paving"))
    return null;
  const heights = corners.map(({ height }) => height);
  if (Math.max(...heights) - Math.min(...heights) > 0.5) return null;
  return Math.min(...heights);
}

/** Where a house's chimney smokes, turned with it. */
function chimneyOf(look: Piece, x: number, y: number, z: number, turn: number, scale: number): Vec3 {
  const [width, height] = look.size;
  return [
    x + Math.cos(turn) * width * 0.22 * KIT_SCALE,
    y + height * 0.95 * KIT_SCALE * scale,
    z - Math.sin(turn) * width * 0.22 * KIT_SCALE,
  ];
}

/** Houses, taverns and the smithy gather a few barrels, crates and sacks at their side. */
function gathersClutter(piece: PieceId): boolean {
  return (
    piece.startsWith("building_home") || piece.startsWith("building_tavern") || piece === "building_blacksmith_blue"
  );
}

/** Nothing on the road, in the stream or hiding a tile from the camera; seeded per board. */
export function planSettlements(shape: IslandShape, trail: readonly Vec3[]): Settlements {
  const random = seededRandom(57);
  const placements: Placement[] = [];
  const blockers: Blocker[] = [];
  const chimneys: Vec3[] = [];
  const built = new Set<PieceId>();

  const facingTrail = (x: number, z: number) => {
    const [tx, , tz] = itemAt(trail, nearestTile(trail, x, z));
    return Math.atan2(tx - x, tz - z);
  };
  const place = (piece: PieceId, x: number, y: number, z: number, turn: number, scale = 1) => {
    placements.push({ piece, x, y, z, turn, scale });
    blockers.push({ x, z, radius: footprint(piece, scale) });
    if (ONCE.has(piece)) built.add(piece);
    const look: Piece = PIECES[piece];
    if (look.smokes) chimneys.push(chimneyOf(look, x, y, z, turn, scale));
  };
  const tryPlace = (piece: PieceId, x: number, z: number, scale = 1) => {
    const radius = footprint(piece, scale);
    const clear = Math.min(
      trailDistance(shape, x, z) - TRAIL_EARTH - 0.4,
      riverDistance(shape, x, z) - RIVER_HALF_WIDTH - 0.6,
    );
    if (clear < radius || !isFree(blockers, x, z, radius, 0.3)) return false;
    if (hidesTiles(trail, x, z, heightOf(piece, scale), radius)) return false;
    const y = buildingSite(shape, x, z, radius * 0.7);
    if (y === null) return false;
    place(piece, x, y - 0.05, z, facingTrail(x, z), scale);
    return true;
  };

  // The village gate the race sets out from, across the road just behind the start's plaza.
  const [first, second] = trail;
  if (first && second) {
    const [sx, , sz] = first;
    const [dx, dz] = [second[0] - sx, second[2] - sz];
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
    if (trailDistance(shape, x, z) - TRAIL_EARTH < radius + 0.4 || !isFree(blockers, x, z, radius, 0.3)) continue;
    if (hidesTiles(trail, x, z, heightOf("building_watermill_blue", 0.8), radius)) continue;
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
    const along = nearestTile(trail, x, z) / Math.max(1, trail.length - 1);
    const region = REGIONS.find(({ until }) => along <= until) ?? itemAt(REGIONS, REGIONS.length - 1);
    if (random() > region.density) continue;
    const pieces = region.pieces.filter(
      ([piece]) =>
        !built.has(piece) && placements.filter((other) => other.piece === piece).length < (CAPS[piece] ?? Infinity),
    );
    const piece = pickWeighted(pieces, random)?.[0];
    if (!piece || !tryPlace(piece, x, z) || !gathersClutter(piece)) continue;
    const radius = footprint(piece);
    for (let item = Math.floor(random() * 3); item >= 0; item--) {
      const angle = random() * Math.PI * 2;
      const [cx, cz] = [x + Math.cos(angle) * (radius + 0.35), z + Math.sin(angle) * (radius + 0.35)];
      if (trailDistance(shape, cx, cz) - TRAIL_EARTH < 0.3) continue;
      const clutter = pick(CLUTTER, random());
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
  return { placements, blockers, chimneys };
}
