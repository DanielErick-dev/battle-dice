import type { Board, Player, RealmTrack, TileId } from "@/game/domain/types";

export type Vec3 = [number, number, number];

export const TILE_SIZE = 2;
export const TILE_HEIGHT = 0.32;
const TILE_GAP = 0.3;
/** Half the width of a slab of the road (see tileSlab): a little wider than a tile is long. */
const SLAB_HALF_WIDTH = TILE_SIZE * 0.56;
export const TILE_PITCH = TILE_SIZE + TILE_GAP;
/** Room between two rows of the trail, for the island's woods and rocks to grow in. */
const ROW_GAP = TILE_PITCH * 2.4;
/** How far the trail sways off a straight row, at most. */
const SWAY = TILE_PITCH * 1.15;
/** Sway waves along a row: every row bends together (so rows never close in on each other), each a little its own. */
const SWAY_WAVES = 1.6;

export interface BoardLayout {
  columns: number;
  rows: number;
  /** Extent of the trail, edge to edge. */
  width: number;
  depth: number;
  position: (id: TileId) => Vec3;
  /** The main path's tiles in order, for the island to lay its trail under. */
  trail: readonly Vec3[];
  /**
   * A main-path tile's slab of the road: its corners round the tile's centre (x, z, counter-clockwise
   * seen from above), cut square to the way at each end so neighbours meet along a shared line; and the
   * way it runs there (an angle, canvas convention: 0 = +x, π/2 = +z). Null off the main path.
   */
  slab: (id: TileId) => { outline: readonly [number, number][]; heading: number } | null;
  /** The realm corridors: each one's centre line (x), half its width and how far it reaches either side of z = 0. */
  corridors: readonly { x: number; halfWidth: number; halfLength: number }[];
}

/** Which side of the board each realm's tracks run along (+1 right, -1 left). */
const TRACK_SIDE = { infernal: 1, celestial: -1 } as const;
/** Height of track tiles: just over the lava, or floating a little above the clouds. */
const TRACK_LEVEL = { infernal: -0.35, celestial: 1.1 } as const;
/** Gap from the trail's edge to the corridor's wall, clear of the island's shore. */
const TRACK_CLEARANCE = 10.5;
/** Distance between consecutive track tiles. */
const TRACK_SPACING = TILE_PITCH * 1.08;
/** Distance between the centre lines of two corridors of a realm, at the least. */
const TRACK_LANE_WIDTH = TILE_PITCH * 3.2;
/** Room left between two corridors of a realm, when they're wide. */
const LANE_GAP = 1.4;
/** Hell is a tight passage, heaven an open cloister. */
export const CORRIDOR_HALF_WIDTH = { infernal: TILE_SIZE / 2 + 0.85, celestial: TILE_SIZE / 2 + 2.4 } as const;

/** Snakes from the far side towards the camera (finish near); realm corridors sit off the island, over the sea. */
export function createBoardLayout(board: Board, columns: number): BoardLayout {
  const trail = windingTrail(board.finishTile, columns);
  const rows = Math.ceil(board.finishTile / columns);
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  const width = Math.max(...xs) - Math.min(...xs) + TILE_SIZE;
  const depth = Math.max(...zs) - Math.min(...zs) + TILE_SIZE;
  const grid = (id: TileId): Vec3 => trail[id - 1] ?? [0, 0, 0];

  const trackPositions = new Map<TileId, Vec3>();
  const corridors: { x: number; halfWidth: number; halfLength: number }[] = [];
  const lanes = { infernal: 0, celestial: 0 };
  for (const track of board.tracks) {
    const lane = lanes[track.realm]++;
    const positions = corridorPositions(track, width, lane);
    track.tiles.forEach((tile, index) => {
      const position = positions[index];
      if (position) trackPositions.set(tile, position);
    });
    const [first] = positions;
    if (!first) continue;
    corridors.push({
      x: first[0],
      halfWidth: CORRIDOR_HALF_WIDTH[track.realm],
      halfLength: Math.abs(first[2]) + TILE_PITCH,
    });
  }

  return {
    columns,
    rows,
    width,
    depth,
    position: (id) => trackPositions.get(id) ?? grid(id),
    trail,
    slab: (id) => (trackPositions.has(id) ? null : tileSlab(trail, id - 1)),
    corridors,
  };
}

/** How far a rift bulges off the road, to the side, between the two tiles it opened between. */
const RIFT_OFFSET = TILE_PITCH * 0.95;

/**
 * The layout with the rifts Zarek's Void opened (see linkRift): each sits beside the road between
 * the two road tiles it came between, several there spread evenly along that stretch.
 */
export function withRiftPositions(layout: BoardLayout, board: Board): BoardLayout {
  const rifts = new Map<TileId, Vec3>();
  const tileAt = (id: TileId) => board.tiles[id - 1];
  for (const tile of board.tiles) {
    if (tile.role !== "rift" || tile.previous === null) continue;
    let from = tile.previous;
    for (let back = tileAt(from); back?.role === "rift"; back = tileAt(from)) from = back.previous ?? from;
    if (rifts.has(tileAt(from)?.next ?? -1)) continue;
    // The run of rifts after `from`, up to the next road tile.
    const run: TileId[] = [];
    let to = tileAt(from)?.next ?? null;
    for (let ahead = to === null ? undefined : tileAt(to); to !== null && ahead?.role === "rift";) {
      run.push(to);
      to = ahead.next;
      ahead = to === null ? undefined : tileAt(to);
    }
    const start = layout.position(from);
    const end = to === null ? start : layout.position(to);
    const [dx, dz] = [end[0] - start[0], end[2] - start[2]];
    const length = Math.hypot(dx, dz) || 1;
    // A tile apart along the road, centred on the gap, so a run never squeezes into one tile's room.
    run.forEach((id, index) => {
      const along = length / 2 + (index - (run.length - 1) / 2) * TILE_PITCH;
      const arc = run.length > 1 ? Math.sin(((index + 1) / (run.length + 1)) * Math.PI) * 0.3 : 0;
      const bulge = RIFT_OFFSET * (1 + arc);
      rifts.set(id, [
        start[0] + (dx / length) * along - (dz / length) * bulge,
        (start[1] + end[1]) / 2,
        start[2] + (dz / length) * along + (dx / length) * bulge,
      ]);
    });
  }
  if (rifts.size === 0) return layout;
  return { ...layout, position: (id) => rifts.get(id) ?? layout.position(id) };
}

/** The main path as a serpentine of wavy rows (flat at the ends so turns stay round) joined by half-circle turns. */
function windingTrail(count: number, columns: number): Vec3[] {
  const rowLength = Math.max(1, columns - 1) * TILE_PITCH;
  const radius = ROW_GAP / 2;
  const needed = Math.max(0, count - 1) * TILE_PITCH;
  // Short rows bend less, or the waves would kink.
  const sway = Math.min(SWAY, rowLength * 0.065);
  // A dense centre line, walked afterwards at even steps.
  const line: [number, number][] = [];
  const STEP = 0.05;
  let length = 0;
  const push = (x: number, z: number) => {
    const last = line.at(-1);
    if (last) length += Math.hypot(x - last[0], z - last[1]);
    line.push([x, z]);
  };
  for (let row = 0; length < needed || line.length === 0; row++) {
    const rightward = row % 2 === 0;
    const z = row * ROW_GAP;
    const steps = Math.ceil(rowLength / STEP);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = (rightward ? u - 0.5 : 0.5 - u) * rowLength;
      const along = x / rowLength + 0.5;
      const offset =
        Math.sin(along * Math.PI) ** 0.7 *
        (Math.sin(along * Math.PI * 2 * SWAY_WAVES) + 0.25 * Math.sin(along * Math.PI * 5 + row * 2.3)) *
        sway *
        0.8;
      push(x, z + offset);
    }
    if (length >= needed) break;
    // Half a circle round the row's end, bulging outwards, down to the next row.
    const side = rightward ? 1 : -1;
    const turnSteps = Math.ceil((Math.PI * radius) / STEP);
    for (let i = 1; i < turnSteps; i++) {
      const angle = (i / turnSteps) * Math.PI;
      push(side * (rowLength / 2 + Math.sin(angle) * radius), z + radius - Math.cos(angle) * radius);
    }
  }

  const tiles: Vec3[] = [];
  let walked = 0;
  let next = 0;
  let previous: [number, number] | undefined;
  for (const point of line) {
    if (tiles.length >= count) break;
    if (previous) walked += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    previous = point;
    if (walked >= next - 1e-6) {
      tiles.push([point[0], 0, point[1]]);
      next += TILE_PITCH;
    }
  }
  while (tiles.length < count) tiles.push(tiles.at(-1) ?? [0, 0, 0]);
  const [minX, maxX] = [Math.min(...tiles.map(([x]) => x)), Math.max(...tiles.map(([x]) => x))];
  const [minZ, maxZ] = [Math.min(...tiles.map(([, , z]) => z)), Math.max(...tiles.map(([, , z]) => z))];
  return tiles.map(([x, y, z]) => [x - (minX + maxX) / 2, y, z - (minZ + maxZ) / 2]);
}

/** The slab of the road under trail tile `index` (see BoardLayout.slab). */
function tileSlab(trail: readonly Vec3[], index: number) {
  const here = trail[index];
  if (!here) return null;
  const [x, , z] = here;
  const before = trail[index - 1];
  const after = trail[index + 1];
  const unit = (dx: number, dz: number): [number, number] => {
    const length = Math.hypot(dx, dz) || 1;
    return [dx / length, dz / length];
  };
  // Coming in and going on; the ends of the trail carry on straight.
  const inward: [number, number] = before
    ? unit(x - before[0], z - before[2])
    : after
      ? unit(after[0] - x, after[2] - z)
      : [1, 0];
  const onward: [number, number] = after ? unit(after[0] - x, after[2] - z) : inward;
  const end = (centre: [number, number], [dx, dz]: [number, number], inset: number) => {
    const [cx, cz] = [centre[0] + dx * inset, centre[1] + dz * inset];
    // Left of the way is (dz, -dx) with +z towards the viewer.
    return {
      left: [cx + dz * SLAB_HALF_WIDTH, cz - dx * SLAB_HALF_WIDTH] as [number, number],
      right: [cx - dz * SLAB_HALF_WIDTH, cz + dx * SLAB_HALF_WIDTH] as [number, number],
    };
  };
  const back = end(
    before
      ? [(before[0] - x) / 2, (before[2] - z) / 2]
      : // The start reaches back further: the plaza everyone lines up on.
        [-inward[0] * (TILE_PITCH * 0.5 + START_PLAZA), -inward[1] * (TILE_PITCH * 0.5 + START_PLAZA)],
    inward,
    TILE_GAP / 2,
  );
  const front = end(
    after ? [(after[0] - x) / 2, (after[2] - z) / 2] : [onward[0] * TILE_PITCH * 0.5, onward[1] * TILE_PITCH * 0.5],
    onward,
    -TILE_GAP / 2,
  );
  const [hx, hz] = unit(inward[0] + onward[0], inward[1] + onward[1]);
  return { outline: [back.right, front.right, front.left, back.left], heading: Math.atan2(hz, hx) };
}

/** Runs far to near, towards the camera, so the corridor's walls never hide its tiles. */
function corridorPositions(track: RealmTrack, width: number, lane: number): Vec3[] {
  const side = TRACK_SIDE[track.realm];
  const halfWidth = CORRIDOR_HALF_WIDTH[track.realm];
  const x =
    side * (width / 2 + TRACK_CLEARANCE + halfWidth + lane * Math.max(TRACK_LANE_WIDTH, halfWidth * 2 + LANE_GAP));
  const count = track.tiles.length;
  return track.tiles.map((_, index) => [x, TRACK_LEVEL[track.realm], (index - (count - 1) / 2) * TRACK_SPACING]);
}

/** How much longer the start's slab is, reaching back: a little square where everyone lines up. */
export const START_PLAZA = 1.6;

/** On the start plaza: figures side by side across the path, rows of this many, this far apart. */
const START_ROW = 4;
const START_SPACING = 0.85;

/** Start: in turn order so nobody walks through another; elsewhere two staggered ranks so each shows from above. */
export function tileOffsetFor(
  player: Player,
  players: readonly Player[],
  along: readonly [number, number],
  onStart = false,
): Vec3 {
  const occupants = players.filter((other) => other.position === player.position);
  const count = occupants.length;
  if (count <= 1 && !onStart) return [0, 0, 0];
  const slot = occupants.findIndex((other) => other.id === player.id);
  const length = Math.hypot(along[0], along[1]) || 1;
  const [ax, az] = [along[0] / length, along[1] / length];
  // Left of the way: (az, -ax).
  const [offsetAlong, offsetAcross] = onStart
    ? startSlot(slot, count)
    : [(slot - (count - 1) / 2) * (count > 2 ? 0.44 : 0.9), count > 2 ? (slot % 2 === 0 ? -0.32 : 0.32) : 0];
  return [ax * offsetAlong + az * offsetAcross, 0, az * offsetAlong - ax * offsetAcross];
}

/** [along, across] of the `slot`-th figure on the start plaza: a row across the path, more rows further back. */
export function startSlot(slot: number, count: number): [number, number] {
  const row = Math.floor(slot / START_ROW);
  const inRow = Math.min(START_ROW, count - row * START_ROW);
  const column = slot % START_ROW;
  return [-START_PLAZA / 2 - row * START_SPACING, ((inRow - 1) / 2 - column) * START_SPACING];
}
