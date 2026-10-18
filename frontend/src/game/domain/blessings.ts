import { getTile } from "./board";
import { updatePlayer, type Draft } from "./draft";
import type { Board, Player, PlayerId, TileId, TimedBlessing } from "./types";

export const TIMED_BLESSINGS: readonly TimedBlessing[] = ["wings", "halo", "inspiration", "spring"];

/** Own turns, not counting the one it's received in. */
export const BLESSING_TURNS = 3;
/** Heaven's own Seraphiel keeps them twice as long. */
export const SERAPH_BLESSING_TURNS = 6;
export const WINGS_BONUS = 2;
export const SPRING_ENERGY = 1;

/** Blessings wait, untouched, until the player is back on the path. */
export function inHeaven(board: Board, position: TileId): boolean {
  return getTile(board, position).track?.realm === "celestial";
}

export function isBlessed(board: Board, player: Player, kind: TimedBlessing): boolean {
  return !inHeaven(board, player.position) && player.blessings.some((blessing) => blessing.kind === kind);
}

/** One the player already has starts over. */
export function grantBlessing(draft: Draft, playerId: PlayerId, kind: TimedBlessing): void {
  updatePlayer(draft, playerId, (player) => ({
    blessings: [
      ...player.blessings.filter((blessing) => blessing.kind !== kind),
      { kind, turnsLeft: blessingTurns(player), fresh: true },
    ],
  }));
}

export function blessingTurns(player: Player): number {
  return player.ability === "seraphBlessing" ? SERAPH_BLESSING_TURNS : BLESSING_TURNS;
}

/** As the player's turn ends; the one received this turn and anything in heaven don't wear. */
export function wearBlessings(board: Board, player: Player): Player["blessings"] {
  if (inHeaven(board, player.position)) return player.blessings;
  return player.blessings
    .map((blessing) =>
      blessing.fresh ? { ...blessing, fresh: false } : { ...blessing, turnsLeft: blessing.turnsLeft - 1 },
    )
    .filter((blessing) => blessing.turnsLeft > 0);
}
