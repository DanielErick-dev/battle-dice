import { HAND_LIMIT } from "../cards/hand";
import type { GameErrorCode } from "../core/errors";
import type { Player } from "../core/state";
import { isPassive, needsDiscardChoice } from "./ability";
import { isAbilityReady } from "./charge";

/** Shared by the UI's button and the engine; charged again the same turn (Ascension), it can be reused. */
export function abilityBlocker(player: Player): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  // From the button the Void steals a spell on the board; its swallowing is offered by the board.
  if (player.ability === "silentVerdict" || isPassive(player.ability)) return "ABILITY_REACTIVE";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
  if (needsDiscardChoice(player.ability) && player.discard.length === 0) return "EMPTY_DISCARD";
  if (needsDiscardChoice(player.ability) && player.hand.length >= HAND_LIMIT) return "HAND_FULL";
  return null;
}
