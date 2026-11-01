import { HAND_LIMIT } from "../cards/hand";
import { isAbilityReady } from "./charge";
import type { Player } from "@/game/domain/types";
import type { GameErrorCode } from "../core/errors";

/** Each charges one step per own turn started, stays ready until used, and empties when used. */
export type AbilityId =
  | "doubleCast" // two cards this turn
  | "theVoid" // Zarek's: swallows the harm he stops on when offered, sets it down anew (characters/zarek/)
  | "tailwind" // this turn's roll walks TAILWIND_BONUS further
  | "studySession" // draws STUDY_DRAWS cards
  | "seraphBlessing" // a random heaven blessing or heaven card (characters/seraphiel/)
  | "hellsDrag" // the Fallen Angel pulls an opponent into hell; alone, hell swallows traps ahead
  | "cleansingTide" // clears every spell off the TIDE_RANGE tiles ahead, whoever cast it
  | "untamed" // nothing harms the Berserker for a while; trampling is his passive (characters/bjorn/)
  | "silentVerdict" // Themis's: armed once charged, turns what's aimed at her on the attacker (characters/themis/)
  | "timeWarp" // halts or reverses an opponent on the same tile; alone, an extra turn
  | "plasmaCannon" // blasts traps ahead and knocks the leading opponent back
  | "levitation" // no tile does anything to the player, blessings and portals included
  | "transmutation" // characters/alchemist/
  | "dormantFury" // this turn's roll times DORMANT_FURY_MULTIPLIER, card modifiers included
  | "arrowRain" // characters/archer/
  | "cardGamble" // characters/jester/
  | "resurrection" // characters/necromancer/
  | "forbiddenSeals" // characters/scribe/
  | "spectralApparitions" // characters/warden/
  | "fairyBloom" // characters/fairy/
  | "ocularAwakening"; // black fire or Spectral Armour, characters/kage/

/** Ocular Awakening's flames or armour, Time Warp's halt or reverse, Card Gamble's "fortune" (thrown for cards). */
export type AbilityPower = "flames" | "armour" | "halt" | "reverse" | "fortune";

export function needsDiscardChoice(ability: AbilityId | null): boolean {
  return ability === "resurrection";
}

/** Offered by the board rather than used from the button (the Void's stealing aside, see abilityBlocker). */
export function isReactive(ability: AbilityId): boolean {
  return ability === "theVoid" || ability === "silentVerdict";
}

/** Shared by the UI's button and the engine; charged again the same turn (Ascension), it can be reused. */
export function abilityBlocker(player: Player): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  // From the button the Void steals a spell on the board; its swallowing is offered by the board.
  if (player.ability === "silentVerdict") return "ABILITY_REACTIVE";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
  if (needsDiscardChoice(player.ability) && player.discard.length === 0) return "EMPTY_DISCARD";
  if (needsDiscardChoice(player.ability) && player.hand.length >= HAND_LIMIT) return "HAND_FULL";
  return null;
}
