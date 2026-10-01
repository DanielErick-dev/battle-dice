import type { Board, Player, RealmTrack, TileId } from "@/game/domain/types";

export type Vec3 = [number, number, number];

export const TILE_SIZE = 1.8;
export const TILE_HEIGHT = 0.32;
const TILE_GAP = 0.45;
export const TILE_PITCH = TILE_SIZE + TILE_GAP;

export interface BoardLayout {
  columns: number;
  rows: number;
  /** Extent of the tile grid, edge to edge. */
  width: number;
  depth: number;
  position: (id: TileId) => Vec3;
}

/** Which side of the board each realm's tracks run along (+1 right, -1 left). */
const TRACK_SIDE = { infernal: 1, celestial: -1 } as const;
/** Height of track tiles: just over the lava, or floating a little above the clouds. */
const TRACK_LEVEL = { infernal: -0.35, celestial: 1.1 } as const;
/** Gap from the grid's edge to the corridor, clear of the arena's stone tiers. */
const TRACK_OFFSET = 5.4;
/** Distance between consecutive track tiles. */
const TRACK_SPACING = TILE_PITCH * 1.08;
/** Each track of a realm gets its own corridor, this far from the next one (walls included). */
const TRACK_LANE_WIDTH = TILE_PITCH * 3.2;
/** Half the corridor's width: where its walls stand, either side of the tiles' centre line. */
export const CORRIDOR_HALF_WIDTH = TILE_SIZE / 2 + 0.85;

/**
 * Snake layout read like a page: the start sits on the far (top) row and the path
 * zig-zags towards the camera, so the finish is on the near (bottom) row. Realm tracks
 * are walled corridors outside the arena, over the sea: infernal ones along the right side,
 * celestial ones along the left, each in its own lane.
 */
export function createBoardLayout(board: Board, columns: number): BoardLayout {
  const totalTiles = board.finishTile;
  const rows = Math.ceil(totalTiles / columns);
  const width = columns * TILE_PITCH - TILE_GAP;
  const depth = rows * TILE_PITCH - TILE_GAP;

  const grid = (id: TileId): Vec3 => {
    const index = id - 1;
    const row = Math.floor(index / columns);
    const column = row % 2 === 0 ? index % columns : columns - 1 - (index % columns);
    return [(column - (columns - 1) / 2) * TILE_PITCH, 0, (row - (rows - 1) / 2) * TILE_PITCH];
  };

  const trackPositions = new Map<TileId, Vec3>();
  const lanes = { infernal: 0, celestial: 0 };
  for (const track of board.tracks) {
    const lane = lanes[track.realm]++;
    corridorPositions(track, width, lane).forEach((position, index) =>
      trackPositions.set(track.tiles[index], position),
    );
  }

  return {
    columns,
    rows,
    width,
    depth,
    position: (id) => trackPositions.get(id) ?? grid(id),
  };
}

/**
 * Tiles of a track in a straight, walled corridor outside the arena on its realm's side, running
 * from far to near (towards the camera, so its walls never hide the tiles), centred on the
 * board's depth, flat.
 */
function corridorPositions(track: RealmTrack, width: number, lane: number): Vec3[] {
  const side = TRACK_SIDE[track.realm];
  const x = side * (width / 2 + TRACK_OFFSET + lane * TRACK_LANE_WIDTH);
  const count = track.tiles.length;
  return track.tiles.map((_, index) => [x, TRACK_LEVEL[track.realm], (index - (count - 1) / 2) * TRACK_SPACING]);
}

/** Offsets tokens that share a tile so they don't overlap. */
export function tileOffsetFor(player: Player, players: readonly Player[]): Vec3 {
  const occupants = players.filter((other) => other.position === player.position);
  if (occupants.length <= 1) return [0, 0, 0];

  const slot = occupants.findIndex((other) => other.id === player.id);
  const angle = (slot / occupants.length) * Math.PI * 2;
  const radius = TILE_SIZE * 0.22;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}
