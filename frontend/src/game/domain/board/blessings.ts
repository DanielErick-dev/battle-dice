import { getTile } from "./board";
import { updatePlayer, type Draft } from "../core/draft";
import type { Board, TileId, TimedBlessing } from "./types";
import type { Player, PlayerId } from "../core/state";

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
  return blessingCount(board, player, kind) > 0;
}

/** Copies of one blessing stack: two Springs give twice the energy while both last. */
export function blessingCount(board: Board, player: Player, kind: TimedBlessing): number {
  if (inHeaven(board, player.position)) return 0;
  return player.blessings.filter((blessing) => blessing.kind === kind).length;
}

/** One the player already has is kept alongside the new one, each wearing on its own. */
export function grantBlessing(draft: Draft, playerId: PlayerId, kind: TimedBlessing): void {
  updatePlayer(draft, playerId, (player) => ({
    blessings: [...player.blessings, { kind, turnsLeft: blessingTurns(player), fresh: true }],
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
