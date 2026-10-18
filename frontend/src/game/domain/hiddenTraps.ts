import { shuffle, type RandomSource } from "./random";
import type { Draft } from "./draft";
import type { Board, PlayerId, TileId, TrapZone } from "./types";

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

/** A hidden trap leaves the board too. */
export function destroyTrap(draft: Draft, playerId: PlayerId, tile: TileId, hidden: boolean): void {
  if (hidden) draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
  if (!draft.destroyedTraps.includes(tile)) draft.destroyedTraps = [...draft.destroyedTraps, tile];
  draft.events.push({ type: "trapDestroyed", playerId, tile, hidden });
}
