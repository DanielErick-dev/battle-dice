import { HAND_LIMIT, MAX_ENERGY } from "./cards";
import type { GameErrorCode } from "./commands";
import type { Player } from "./types";

/**
 * Character abilities. Each charges over its owner's turns, one per turn started, and once
 * charged stays ready until the player chooses to use it; using it empties the charge.
 * - doubleCast: two cards may be played this turn instead of one.
 * - crimsonMarch: this turn's roll walks CRIMSON_MARCH_BONUS tiles further.
 * - celestialGrace: CELESTIAL_GRACE_ENERGY energy, right away.
 * - dragonHoard: DRAGON_HOARD_DRAWS cards drawn, right away.
 * - levitation: the player floats for LEVITATION_TURNS of their turns, this one included: no
 *   tile does anything to them (traps, hidden ones too, curses, blessings, portals…).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - dormantFury: this turn's roll walks DORMANT_FURY_MULTIPLIER times the dice (1 → 3, 6 → 18),
 *   card modifiers included. Charges over LONG_ABILITY_CYCLE turns.
 * - transmutation: a card chosen from the hand becomes a random rare or epic card
 *   (see transmutation.ts).
 * - arrowRain: a volley of arrows: every opponent is knocked back ARROW_RAIN_PUSH tiles. Alone on
 *   the board, the arrows pin down the next ARROW_RAIN_PINS traps ahead instead (hidden ones and
 *   curses too), harmless until the player walks past them (see arrowRain.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - cardGamble: a die of fortune decides: 1 to CARD_GAMBLE_LOSES_UP_TO loses a random card to an
 *   opponent, higher steals CARD_GAMBLE_STOLEN random cards from one (see cardGamble.ts).
 * - resurrection: up to RESURRECTION_CARDS cards the player picks from their own discard pile
 *   (the cards they played or threw away) come back to their hand (see resurrection.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - forbiddenSeals: four seals (one of each SealKind) written on tiles the player picks within
 *   SEAL_RANGE of them, looking all alike to the others. Whoever else stops on one breaks it and
 *   suffers it; alone on the board, the player's own seals reward them instead (see seals.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - spectralApparitions: two apparitions of the player (one of each SpecterKind) appear on tiles
 *   they pick within SPECTER_RANGE. Whoever else walks through one is struck: Plunder lets the
 *   player take PLUNDER_CARDS cards of their choice from that hand, Hunger takes all their
 *   energy (what doesn't fit charges the ability by one). Walking through the player themselves
 *   dispels both. Alone, walking through their own apparitions rewards them (see specters.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - trapWard: reactive, never used on its own. When a trap (hidden ones too) or a curse is
 *   about to strike, the player is asked whether to spend it and ignore the harm; a trap is
 *   smashed for good. Charges over LONG_ABILITY_CYCLE turns.
 */
export type AbilityId =
  | "doubleCast"
  | "trapWard"
  | "crimsonMarch"
  | "celestialGrace"
  | "dragonHoard"
  | "levitation"
  | "transmutation"
  | "dormantFury"
  | "arrowRain"
  | "cardGamble"
  | "resurrection"
  | "forbiddenSeals"
  | "spectralApparitions";

/** Turns to charge an ability, from empty. */
export const ABILITY_CYCLE = 3;
/**
 * The strongest abilities take longer to come back: Trap Ward smashes traps for good,
 * Levitation lasts two turns, Transmutation hands out a rare or epic card, Dormant Fury
 * triples a roll, Arrow Rain hits every opponent at once and Resurrection brings back the cards
 * the player wants.
 */
export const LONG_ABILITY_CYCLE = 5;

const LONG_CHARGE_ABILITIES: readonly AbilityId[] = [
  "trapWard",
  "levitation",
  "transmutation",
  "dormantFury",
  "arrowRain",
  "resurrection",
  "forbiddenSeals",
  "spectralApparitions",
];

/** Turns this ability takes to charge from empty. */
export function abilityCycle(ability: AbilityId | null): number {
  return ability !== null && LONG_CHARGE_ABILITIES.includes(ability) ? LONG_ABILITY_CYCLE : ABILITY_CYCLE;
}
/** Own turns a Levitation lasts, counting the one it's used on. */
export const LEVITATION_TURNS = 2;
export const CRIMSON_MARCH_BONUS = 2;
export const CELESTIAL_GRACE_ENERGY = 2;
export const DRAGON_HOARD_DRAWS = 2;
export const DORMANT_FURY_MULTIPLIER = 3;
/** Tiles Arrow Rain knocks every opponent back. */
export const ARROW_RAIN_PUSH = 6;
/** Traps ahead Arrow Rain pins down when there are no opponents. */
export const ARROW_RAIN_PINS = 3;
/** Card Gamble's die: this value or lower goes wrong, higher goes right. */
export const CARD_GAMBLE_LOSES_UP_TO = 2;
/** Cards Card Gamble steals from an opponent on a win, and hands one on a loss. */
export const CARD_GAMBLE_STOLEN = 2;
export const CARD_GAMBLE_LOST = 1;
/** Alone on the board, a won Card Gamble draws this many cards instead. */
export const CARD_GAMBLE_DRAWS = 2;
/** Cards Resurrection brings back from the discard pile, at most. */
export const RESURRECTION_CARDS = 2;
/** Forbidden Seals: how far from the player (ahead or behind) a seal may be written. */
export const SEAL_RANGE = 12;
/** Tiles the Seal of Ruin throws an opponent back. */
export const RUIN_PUSH = 10;
/** Energy the Blood Pact seal takes from an opponent and hands the Scribe. */
export const BLOOD_PACT_ENERGY = 2;
/** Turns' worth of silence (see Player.silencedTurns): the one it strikes in, and the next. */
export const SILENCE_TURNS = 2;
/** Alone on the board, what each own seal gives: tiles ahead for Ruin, energy for Silence and the Pact. */
export const SOLO_RUIN_ADVANCE = 3;
export const SOLO_SILENCE_ENERGY = 1;
export const SOLO_PACT_ENERGY = 2;
/** Spectral Apparitions: how far from the player an apparition may appear. */
export const SPECTER_RANGE = 12;
/** Cards the Plunder specter takes from whoever walks through it; alone, cards it draws. */
export const PLUNDER_CARDS = 2;

/** Abilities used on a card the player picks from their hand. */
export function needsCardChoice(ability: AbilityId | null): boolean {
  return ability === "transmutation";
}

/** Abilities used on cards the player picks from their own discard pile. */
export function needsDiscardChoice(ability: AbilityId | null): boolean {
  return ability === "resurrection";
}

/** Abilities used by writing seals on tiles the player picks. */
export function needsSealPlacement(ability: AbilityId | null): boolean {
  return ability === "forbiddenSeals";
}

/** Abilities used by summoning apparitions on tiles the player picks. */
export function needsSpecterPlacement(ability: AbilityId | null): boolean {
  return ability === "spectralApparitions";
}

/** Abilities that answer a threat instead of being used on the player's turn. */
export function isReactive(ability: AbilityId): boolean {
  return ability === "trapWard";
}

export function isAbilityReady(player: Player): boolean {
  return player.ability !== null && player.abilityCharge >= abilityCycle(player.ability);
}

/**
 * Why the player can't use their ability on their turn right now, or null. The UI asks this
 * to enable its button with the same reasons the engine enforces.
 */
export function abilityBlocker(player: Player, abilityInUse: AbilityId | null): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  if (isReactive(player.ability)) return "ABILITY_REACTIVE";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
  if (abilityInUse !== null) return "ABILITY_IN_USE";
  if (player.ability === "celestialGrace" && player.energy >= MAX_ENERGY) return "ENERGY_FULL";
  if (needsCardChoice(player.ability) && player.hand.length === 0) return "EMPTY_HAND";
  if (needsDiscardChoice(player.ability) && player.discard.length === 0) return "EMPTY_DISCARD";
  if (needsDiscardChoice(player.ability) && player.hand.length >= HAND_LIMIT) return "HAND_FULL";
  return null;
}

/** Cards the current player may play this turn. */
export function cardsPerTurn(abilityInUse: AbilityId | null): number {
  return abilityInUse === "doubleCast" ? 2 : 1;
}

/** Tiles the ability in use adds to this turn's roll. */
export function rollBonus(abilityInUse: AbilityId | null): number {
  return abilityInUse === "crimsonMarch" ? CRIMSON_MARCH_BONUS : 0;
}

/** What the ability in use multiplies this turn's roll by. */
export function rollMultiplier(abilityInUse: AbilityId | null): number {
  return abilityInUse === "dormantFury" ? DORMANT_FURY_MULTIPLIER : 1;
}

/** Energy Celestial Grace gives the player now (up to the maximum). */
export function graceEnergy(player: Player): number {
  return player.ability === "celestialGrace" ? Math.min(CELESTIAL_GRACE_ENERGY, MAX_ENERGY - player.energy) : 0;
}

/** The player as their turn starts: one more turn of charge, and whether that made it ready. */
export function chargeAbility(player: Player): {
  player: Player;
  becameReady: boolean;
} {
  if (player.ability === null || isAbilityReady(player)) return { player, becameReady: false };
  const charged = { ...player, abilityCharge: player.abilityCharge + 1 };
  return { player: charged, becameReady: isAbilityReady(charged) };
}
