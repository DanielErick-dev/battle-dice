import type { Tile, TileId } from "./types";

/** Nearest to `position` first, the lower id on ties. */
export function byDistanceFrom(position: TileId): (a: TileId, b: TileId) => number {
  return (a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b;
}

/** Never the start, the finish, a realm track or a rift. */
export function isRegularMainTile({ role, track }: Tile): boolean {
  return role === "regular" && !track;
}

export function inHellTrack({ track }: Tile): boolean {
  return track?.realm === "infernal";
}

/** Where frost and the spells the Void takes may land: heaven keeps none. */
export function isSpellGround(tile: Tile): boolean {
  return isRegularMainTile(tile) || inHellTrack(tile);
}
