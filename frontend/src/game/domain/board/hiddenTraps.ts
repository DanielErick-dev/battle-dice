import { shuffle, type RandomSource } from "../core/random";
import type { Board, TileId, TrapZone } from "./types";

export const HIDDEN_TRAP_PUSH = 5;

export function placeHiddenTraps(board: Board, random: RandomSource): TileId[] {
  return board.trapZones.flatMap((zone) => shuffle(zone.tiles, random).slice(0, zone.traps));
}

function trapZoneOf(board: Board, tile: TileId): TrapZone | undefined {
  return board.trapZones.find((zone) => zone.tiles.includes(tile));
}

/** Once found, the trap on `tile` moves to a free tile of its zone, so knowing where it was doesn't help. */
export function relocateHiddenTrap(
  board: Board,
  traps: readonly TileId[],
  tile: TileId,
  random: RandomSource,
  smashed: readonly TileId[] = [],
): TileId[] {
  const zone = trapZoneOf(board, tile);
  const free =
    zone?.tiles.filter(
      (candidate) => candidate !== tile && !traps.includes(candidate) && !smashed.includes(candidate),
    ) ?? [];
  if (free.length === 0) return [...traps];
  const destination = free[Math.floor(random() * free.length)];
  return traps.map((trap) => (trap === tile ? destination : trap));
}
