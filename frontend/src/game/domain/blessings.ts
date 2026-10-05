import { updatePlayer, type Draft } from "./draft";
import type { Player, PlayerId, TimedBlessing } from "./types";

/** Rounds each of heaven's blessings lasts (the player's own turns, the one it's received in not counted). */
export const BLESSING_TURNS = 3;
/** Tiles Wings add to every roll. */
export const WINGS_BONUS = 2;
/** Energy the Spring of Light gives as each of the player's turns starts. */
export const SPRING_ENERGY = 1;

export function isBlessed(player: Player, kind: TimedBlessing): boolean {
  return player.blessings.some((blessing) => blessing.kind === kind);
}

/** A blessing lands on the player for BLESSING_TURNS rounds; one they already have starts over. */
export function grantBlessing(draft: Draft, playerId: PlayerId, kind: TimedBlessing): void {
  updatePlayer(draft, playerId, (player) => ({
    blessings: [
      ...player.blessings.filter((blessing) => blessing.kind !== kind),
      { kind, turnsLeft: BLESSING_TURNS, fresh: true },
    ],
  }));
}

/** The player's turn is over: a round less on each blessing, but the one received during it. */
export function wearBlessings(player: Player): Player["blessings"] {
  return player.blessings
    .map((blessing) =>
      blessing.fresh ? { ...blessing, fresh: false } : { ...blessing, turnsLeft: blessing.turnsLeft - 1 },
    )
    .filter((blessing) => blessing.turnsLeft > 0);
}
