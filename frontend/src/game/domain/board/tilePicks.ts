import type { Board, TileId } from "@/game/domain/types";

// Shared by the abilities that let the player pick tiles: fire, frost, seals and apparitions.

/** Regular tiles of the main path: never the start, the finish, a realm track or a rift. */
export function regularMainTiles(board: Board): TileId[] {
  return board.tiles.filter(({ role, track }) => role === "regular" && !track).map(({ id }) => id);
}

/** Nearest to `position` first, the lower id on ties. */
export function byDistanceFrom(position: TileId): (a: TileId, b: TileId) => number {
  return (a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b;
}

/** Between `min` and `max` distinct tiles, all of them `allowed`. */
export function isValidPick(
  tiles: readonly TileId[],
  allowed: readonly TileId[],
  { min, max }: { min: number; max: number },
): boolean {
  return (
    tiles.length >= min &&
    tiles.length <= max &&
    new Set(tiles).size === tiles.length &&
    tiles.every((tile) => allowed.includes(tile))
  );
}
