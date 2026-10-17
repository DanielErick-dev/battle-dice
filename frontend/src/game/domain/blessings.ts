import { getTile } from "./board";
import { updatePlayer, type Draft } from "./draft";
import type { Board, Player, PlayerId, TileId, TimedBlessing } from "./types";

/** Rounds each of heaven's blessings lasts (the player's own turns, the one it's received in not counted). */
export const BLESSING_TURNS = 3;
/** Rounds the blessings last on Seraphiel, heaven's own. */
export const SERAPH_BLESSING_TURNS = 6;
/** Tiles Wings add to every roll. */
export const WINGS_BONUS = 2;
/** Energy the Spring of Light gives as each of the player's turns starts. */
export const SPRING_ENERGY = 1;

/** On a celestial track: heaven's blessings wait there, untouched, until the player is back on the path. */
export function inHeaven(board: Board, position: TileId): boolean {
  return getTile(board, position).track?.realm === "celestial";
}

/** The blessing is on the player and working: never while they're still in heaven. */
export function isBlessed(board: Board, player: Player, kind: TimedBlessing): boolean {
  return !inHeaven(board, player.position) && player.blessings.some((blessing) => blessing.kind === kind);
}

/**
 * A blessing lands on the player for BLESSING_TURNS rounds (Seraphiel's for SERAPH_BLESSING_TURNS);
 * one they already have starts over.
 */
export function grantBlessing(draft: Draft, playerId: PlayerId, kind: TimedBlessing): void {
  updatePlayer(draft, playerId, (player) => ({
    blessings: [
      ...player.blessings.filter((blessing) => blessing.kind !== kind),
      { kind, turnsLeft: blessingTurns(player), fresh: true },
    ],
  }));
}

/** Rounds a blessing lasts on this player: twice as long on heaven's own Seraphiel. */
export function blessingTurns(player: Player): number {
  return player.ability === "seraphBlessing" ? SERAPH_BLESSING_TURNS : BLESSING_TURNS;
}

/**
 * The player's turn is over: a round less on each blessing, but the one received during it. In
 * heaven nothing wears off: the rounds only start counting on the turn after they leave it.
 */
export function wearBlessings(board: Board, player: Player): Player["blessings"] {
  if (inHeaven(board, player.position)) return player.blessings;
  return player.blessings
    .map((blessing) =>
      blessing.fresh ? { ...blessing, fresh: false } : { ...blessing, turnsLeft: blessing.turnsLeft - 1 },
    )
    .filter((blessing) => blessing.turnsLeft > 0);
}
