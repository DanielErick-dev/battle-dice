import { HAND_LIMIT } from "./cards";
import type { GameErrorCode } from "./commands";
import type { Player } from "./types";

/**
 * Character abilities. Each charges over its owner's turns, one per turn started, and once
 * charged stays ready until the player chooses to use it; using it empties the charge.
 * - doubleCast: two cards may be played this turn instead of one.
 * - tailwind: this turn's roll walks TAILWIND_BONUS tiles further.
 * - studySession: STUDY_DRAWS cards drawn, right away.
 * - seraphBlessing: heaven's gift, at random, right away: one of its timed blessings, or (as likely,
 *   SERAPH_CARD_CHANCE) a card of the deck going into the hand. Seraphiel's passives
 *   (picking heaven's gifts, his crown, the Fall into hell) are in seraph.ts.
 * - hellsDrag: the Fallen Angel's ability, once Seraphiel has fallen: the chosen opponent is pulled
 *   down into hell, and comes out of it where they were taken; alone, hell swallows the next
 *   DRAG_TRAPS traps ahead. Charges over HELLS_DRAG_CYCLE turns.
 * - cleansingTide: a wave clears every spell off the TIDE_RANGE tiles ahead (black fire, snow,
 *   apparitions, seals, pinned arrows), whoever cast it. Charges over LONG_ABILITY_CYCLE turns.
 * - untamed: for UNTAMED_TURNS of the player's turns, this one included, nothing harms them: the
 *   board's traps (hidden ones too), curses and lost-turn tiles are shrugged off where they stop,
 *   and nothing other players aim at them gets through (as under Spectral Armour); blessings still
 *   work. The charge only starts again once it's over. Its passive, always on: every opponent the
 *   player walks through or stops on with their own move is knocked back TRAMPLE_PUSH tiles
 *   (see berserker.ts). Charges over LONG_ABILITY_CYCLE turns.
 * - sacredBulwark: Arcane Shield plus Spectral Armour for ARMOUR_TURNS of their turns.
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - timeWarp: the player bends the time of an opponent in the same place (see sameSpace): halted,
 *   they lose their next TIME_ROUNDS turns, or reversed, their next TIME_ROUNDS rolls walk backwards
 *   (either adds up with what they already had). Aimed at one under armour, Untamed or heaven's Aegis,
 *   it's spent for nothing (see aimWard). Its charge only starts again once the TIME_ROUNDS rounds
 *   have gone by. With nobody there, the player plays again after this turn instead. Charges over
 *   TIME_WARP_CYCLE turns.
 * - plasmaCannon: the next PLASMA_TRAPS traps ahead are blasted away for good and the opponent in
 *   reach furthest ahead is knocked back PLASMA_PUSH tiles. Charges over LONG_ABILITY_CYCLE turns.
 *   (These, Untamed aside: see newcomerAbilities.ts.)
 * - levitation: the player floats for LEVITATION_TURNS of their turns, this one included: no
 *   tile does anything to them (traps, hidden ones too, curses, blessings, portals…).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - dormantFury: this turn's roll walks DORMANT_FURY_MULTIPLIER times the dice (1 → 3, 6 → 18),
 *   card modifiers included. Charges over LONG_ABILITY_CYCLE turns.
 * - transmutation: TRANSMUTATION_CARDS cards chosen from the hand are sacrificed for one random
 *   card of their rarity levels added up (two level-2 cards make a level 4); with fewer cards in
 *   hand, one card of TRANSMUTATION_FALLBACK_LEVEL appears in it instead (see transmutation.ts).
 * - arrowRain: a volley of arrows, aimed as the player picks: at the opponents, every one in
 *   reach knocked back ARROW_RAIN_PUSH tiles, or at the next ARROW_RAIN_PINS traps ahead (hidden ones and curses too),
 *   pinned down and harmless until the player walks past them (see arrowRain.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - cardGamble: a die of fortune decides: 1 to CARD_GAMBLE_LOSES_UP_TO loses a random card to an
 *   opponent, higher steals CARD_GAMBLE_STOLEN random cards from one, and CARD_GAMBLE_JACKPOT
 *   steals epics first. With no opponent to win from, the player may throw the die for cards
 *   instead, drawing as many as it shows (see cardGamble.ts).
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
 * - fairyBloom: the next ENCHANT_TILES harmful tiles ahead (traps, hidden ones too, curses) are
 *   enchanted for good, under snow: their harm is gone. The player stopping on or walking over one
 *   is carried ENCHANT_ADVANCE tiles ahead; an opponent stopping on one is stuck in the snow for
 *   ENCHANT_FREEZE rounds; either way their ability gains a turn of charge (see fairy.ts).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - ocularAwakening: the player picks one of two powers. Eternal Flames sets FLAME_TILES tiles they
 *   pick anywhere on the main path on black fire for FLAME_TURNS rounds: an opponent
 *   stopping on one (walking through is harmless) loses FLAME_ENERGY energy and is thrown back FLAME_PUSH tiles;
 *   a fire goes out once it has scorched FLAME_HITS times, and every scorch charges her ability by a turn.
 *   Spectral Armour shields them for ARMOUR_TURNS of their turns from everything other players
 *   aim at them (cards, abilities, seals, apparitions, flames); the board's own traps and curses
 *   still strike (see kunoichi.ts). Inside her Susanoo, no one can stop on her tile: whoever tries
 *   is thrown back SUSANOO_PUSH tiles, and those on a tile she stops on are thrown SUSANOO_PUSH ahead. Charges over LONG_ABILITY_CYCLE turns.
 * - trapWard: reactive, never used on its own. When a trap (hidden ones too) or a curse is
 *   about to strike, the player is asked whether to spend it and ignore the harm; a trap is
 *   smashed for good. Charges over SHORT_ABILITY_CYCLE turns.
 */
export type AbilityId =
  | "doubleCast"
  | "trapWard"
  | "tailwind"
  | "studySession"
  | "seraphBlessing"
  | "hellsDrag"
  | "cleansingTide"
  | "untamed"
  | "sacredBulwark"
  | "timeWarp"
  | "plasmaCannon"
  | "levitation"
  | "transmutation"
  | "dormantFury"
  | "arrowRain"
  | "cardGamble"
  | "resurrection"
  | "forbiddenSeals"
  | "spectralApparitions"
  | "fairyBloom"
  | "ocularAwakening";

/** The power picked as an ability is used: Ocular Awakening's flames or armour, Time Warp's halt or reverse. */
/** Card Gamble's "fortune": with no opponent to win from, the die is thrown for cards instead. */
export type AbilityPower = "flames" | "armour" | "halt" | "reverse" | "fortune";

/** Turns to charge an ability, from empty. */
export const ABILITY_CYCLE = 3;
/** Trap Ward only answers the board's own traps, so it comes back quicker than the rest. */
export const SHORT_ABILITY_CYCLE = 2;
/**
 * The strongest abilities take longer to come back: Levitation lasts two turns, Dormant Fury
 * triples a roll, Arrow Rain hits every opponent at once and Resurrection brings back the cards
 * the player wants.
 */
export const LONG_ABILITY_CYCLE = 5;
/** Kage Rubra's Ocular Awakening (ten rounds of black fire, or her armour) is slow to return. */
export const OCULAR_AWAKENING_CYCLE = 6;
/** Hell's Drag throws a whole hell in someone's way: the slowest of all to return. */
export const HELLS_DRAG_CYCLE = 7;
/** Time Warp takes a whole opponent out of the race for two rounds: as slow to return. */
export const TIME_WARP_CYCLE = 7;

const LONG_CHARGE_ABILITIES: readonly AbilityId[] = [
  "levitation",
  "dormantFury",
  "arrowRain",
  "resurrection",
  "forbiddenSeals",
  "spectralApparitions",
  "fairyBloom",
  "cleansingTide",
  "untamed",
  "sacredBulwark",
  "plasmaCannon",
];

/** Turns this ability takes to charge from empty. */
export function abilityCycle(ability: AbilityId | null): number {
  if (ability === "trapWard") return SHORT_ABILITY_CYCLE;
  if (ability === "ocularAwakening") return OCULAR_AWAKENING_CYCLE;
  if (ability === "hellsDrag") return HELLS_DRAG_CYCLE;
  if (ability === "timeWarp") return TIME_WARP_CYCLE;
  return ability !== null && LONG_CHARGE_ABILITIES.includes(ability) ? LONG_ABILITY_CYCLE : ABILITY_CYCLE;
}
/** Own turns a Levitation lasts, counting the one it's used on. */
export const LEVITATION_TURNS = 2;
export const TAILWIND_BONUS = 4;
export const STUDY_DRAWS = 2;
/** Own turns Untamed lasts, counting the one it's used on. */
export const UNTAMED_TURNS = 3;
/** Tiles the Berserker's trample knocks an opponent back. */
export const TRAMPLE_PUSH = 6;
/** Plasma Cannon: traps ahead it blasts away, and how far it knocks the leading opponent back. */
export const PLASMA_TRAPS = 2;
export const PLASMA_PUSH = 6;
/** Tiles ahead Cleansing Tide sweeps clean. */
export const TIDE_RANGE = 20;
/** Rounds Time Warp halts an opponent for, or reverses their rolls for. */
export const TIME_ROUNDS = 2;
export const DORMANT_FURY_MULTIPLIER = 3;
/** Hand cards Transmutation sacrifices for one card of their rarity levels added up. */
export const TRANSMUTATION_CARDS = 2;
/** With fewer cards in hand, the rarity level of the one card Transmutation distils instead. */
export const TRANSMUTATION_FALLBACK_LEVEL = 3;
/** Tiles Arrow Rain knocks every opponent back. */
export const ARROW_RAIN_PUSH = 10;
/** Traps ahead Arrow Rain pins down when there are no opponents. */
export const ARROW_RAIN_PINS = 3;
/** Card Gamble's die: this value or lower goes wrong, higher goes right. */
export const CARD_GAMBLE_LOSES_UP_TO = 2;
/** Cards Card Gamble steals from an opponent on a win, and hands one on a loss. */
export const CARD_GAMBLE_STOLEN = 2;
export const CARD_GAMBLE_LOST = 1;
/** Alone on the board, a won Card Gamble draws this many cards instead. */
export const CARD_GAMBLE_DRAWS = 2;
/**
 * Card Gamble's jackpot: this roll steals epic cards first (topped up with random ones); alone on
 * the board it conjures CARD_GAMBLE_EPICS random epic cards instead of drawing.
 */
export const CARD_GAMBLE_JACKPOT = 6;
export const CARD_GAMBLE_EPICS = 2;
/** Cards Resurrection brings back from the discard pile, at most. */
export const RESURRECTION_CARDS = 2;
/** Forbidden Seals: how far from the player (ahead or behind) a seal may be written. */
export const SEAL_RANGE = 20;
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
export const SPECTER_RANGE = 20;
/** Cards the Plunder specter takes from whoever walks through it; alone, cards it draws. */
export const PLUNDER_CARDS = 2;
/** Fairy Bloom: harmful tiles ahead it enchants, how far one carries the fairy, the energy it drains. */
export const ENCHANT_TILES = 3;
export const ENCHANT_ADVANCE = 5;
/** Rounds an opponent stopping on the fairy's snow stays stuck in it (turns they lose). */
export const ENCHANT_FREEZE = 2;
/** Tiles of the main path Eternal Winter freezes every round, from the start toward the finish. */
export const WINTER_TILES = 10;
/** Energy each round stuck in the snow drains from the player into the fairy. */
export const SNOW_DRAIN = 1;
/**
 * Eternal Flames: tiles set alight (anywhere on the main path); how many rounds they burn (every
 * player playing once); how many times a fire scorches someone before it goes out.
 */
export const FLAME_TILES = 2;
export const FLAME_TURNS = 10;
export const FLAME_HITS = 2;
/** What the black fire does to an opponent stopping on it. */
export const FLAME_ENERGY = 2;
export const FLAME_PUSH = 10;
/** Own turns Spectral Armour lasts, counting the one it's raised on. */
export const ARMOUR_TURNS = 3;
/** How likely Seraph's Blessing gives a card rather than a blessing. */
export const SERAPH_CARD_CHANCE = 0.5;
/** How far her Susanoo throws back anyone stopping on her tile. */
export const SUSANOO_PUSH = 1;

/** Abilities used on cards the player picks from their own discard pile. */
export function needsDiscardChoice(ability: AbilityId | null): boolean {
  return ability === "resurrection";
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
 * to enable its button with the same reasons the engine enforces. Charged again in the same turn
 * (Ascension), it can be used again.
 */
export function abilityBlocker(player: Player): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  if (isReactive(player.ability)) return "ABILITY_REACTIVE";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
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
  return abilityInUse === "tailwind" ? TAILWIND_BONUS : 0;
}

/** What the ability in use multiplies this turn's roll by. */
export function rollMultiplier(abilityInUse: AbilityId | null): number {
  return abilityInUse === "dormantFury" ? DORMANT_FURY_MULTIPLIER : 1;
}

/**
 * The player as their turn starts: one more turn of charge, and whether that made it ready.
 * Untamed doesn't charge while it lasts, nor Time Warp while its turns are held (see Player.chargeHeld),
 * unless the charge comes from the board (`fromBoard`: a charge tile always fills it a turn).
 */
export function chargeAbility(
  player: Player,
  { fromBoard = false }: { fromBoard?: boolean } = {},
): {
  player: Player;
  becameReady: boolean;
} {
  const held = !fromBoard && (player.untamed > 0 || player.chargeHeld > 0);
  if (player.ability === null || isAbilityReady(player) || held) return { player, becameReady: false };
  const charged = { ...player, abilityCharge: player.abilityCharge + 1 };
  return { player: charged, becameReady: isAbilityReady(charged) };
}
