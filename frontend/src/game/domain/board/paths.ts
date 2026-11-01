import { getTile, nextTile, previousTile } from "./board";
import type { Board, RealmEntry, TileId } from "@/game/domain/types";

/** Stops at the finish tile (no bounce back). */
export function walkPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  return followPath(origin, steps, (tile) => nextTile(board, tile, entry));
}

export function pushPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  return followPath(origin, steps, (tile) => previousTile(board, tile, entry));
}

function followPath(origin: TileId, steps: number, step: (tile: TileId) => TileId | null): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let taken = 0; taken < steps; taken++) {
    tile = step(tile);
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}

/** The tiles after `from` along their own links (no realm exits), lazily: scans ahead stop once they've found enough. */
export function* tilesAhead(board: Board, from: TileId): Generator<TileId> {
  let tile = getTile(board, from).next;
  while (tile !== null) {
    yield tile;
    tile = getTile(board, tile).next;
  }
}
