import { HAND_LIMIT } from "./cards";
import type { GameErrorCode } from "./commands";
import type { Player } from "./types";

/** Each charges one step per own turn started, stays ready until used, and empties when used. */
export type AbilityId =
  | "doubleCast" // two cards this turn
  | "theVoid" // Zarek's: swallows the harm he stops on when offered, sets it down anew (see void.ts)
  | "tailwind" // this turn's roll walks TAILWIND_BONUS further
  | "studySession" // draws STUDY_DRAWS cards
  | "seraphBlessing" // a random heaven blessing or heaven card (passives in seraph.ts)
  | "hellsDrag" // the Fallen Angel pulls an opponent into hell; alone, hell swallows traps ahead
  | "cleansingTide" // clears every spell off the TIDE_RANGE tiles ahead, whoever cast it
  | "untamed" // nothing harms the Berserker for a while; trampling is his passive (berserker.ts)
  | "silentVerdict" // Themis's: armed once charged, turns what's aimed at her on the attacker (see verdict.ts)
  | "timeWarp" // halts or reverses an opponent on the same tile; alone, an extra turn
  | "plasmaCannon" // blasts traps ahead and knocks the leading opponent back
  | "levitation" // no tile does anything to the player, blessings and portals included
  | "transmutation" // see transmutation.ts
  | "dormantFury" // this turn's roll times DORMANT_FURY_MULTIPLIER, card modifiers included
  | "arrowRain" // see arrowRain.ts
  | "cardGamble" // see cardGamble.ts
  | "resurrection" // see resurrection.ts
  | "forbiddenSeals" // see seals.ts
  | "spectralApparitions" // see specters.ts
  | "fairyBloom" // see fairy.ts
  | "ocularAwakening"; // black fire or Spectral Armour, see kunoichi.ts

/** Ocular Awakening's flames or armour, Time Warp's halt or reverse, Card Gamble's "fortune" (thrown for cards). */
export type AbilityPower = "flames" | "armour" | "halt" | "reverse" | "fortune";

export const ABILITY_CYCLE = 3;
/** The strongest abilities take longer to come back. */
export const LONG_ABILITY_CYCLE = 5;
export const OCULAR_AWAKENING_CYCLE = 6;
/** Hell's Drag and Time Warp take a whole opponent out of the race: the slowest to return. */
export const HELLS_DRAG_CYCLE = 7;
export const TIME_WARP_CYCLE = 7;
export const VERDICT_CYCLE = 4;

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
  "plasmaCannon",
];

export function abilityCycle(ability: AbilityId | null): number {
  if (ability === "ocularAwakening") return OCULAR_AWAKENING_CYCLE;
  if (ability === "hellsDrag") return HELLS_DRAG_CYCLE;
  if (ability === "timeWarp") return TIME_WARP_CYCLE;
  if (ability === "silentVerdict") return VERDICT_CYCLE;
  return ability !== null && LONG_CHARGE_ABILITIES.includes(ability) ? LONG_ABILITY_CYCLE : ABILITY_CYCLE;
}
/** Own turns, counting the one it's used on. */
export const LEVITATION_TURNS = 2;
export const TAILWIND_BONUS = 4;
export const STUDY_DRAWS = 2;
/** Own turns, counting the one it's used on. */
export const UNTAMED_TURNS = 3;
export const TRAMPLE_PUSH = 6;
export const PLASMA_TRAPS = 2;
export const PLASMA_PUSH = 6;
export const TIDE_RANGE = 20;
export const TIME_ROUNDS = 2;
export const DORMANT_FURY_MULTIPLIER = 3;
export const TRANSMUTATION_CARDS = 2;
/** Rarity of the card Transmutation distils when the hand is too small to sacrifice. */
export const TRANSMUTATION_FALLBACK_LEVEL = 3;
export const ARROW_RAIN_PUSH = 10;
export const ARROW_RAIN_PINS = 3;
/** Card Gamble's die: this value or lower goes wrong. */
export const CARD_GAMBLE_LOSES_UP_TO = 2;
export const CARD_GAMBLE_STOLEN = 2;
export const CARD_GAMBLE_LOST = 1;
/** Alone on the board, a won Card Gamble draws instead. */
export const CARD_GAMBLE_DRAWS = 2;
/** This roll steals epics first; alone, it conjures CARD_GAMBLE_EPICS epics instead of drawing. */
export const CARD_GAMBLE_JACKPOT = 6;
export const CARD_GAMBLE_EPICS = 2;
export const RESURRECTION_CARDS = 2;
/** Ahead or behind the player. */
export const SEAL_RANGE = 20;
export const RUIN_PUSH = 10;
export const BLOOD_PACT_ENERGY = 2;
/** The turn it strikes in, and the next. */
export const SILENCE_TURNS = 2;
/** Alone on the board, the player's own seals reward them. */
export const SOLO_RUIN_ADVANCE = 3;
export const SOLO_SILENCE_ENERGY = 1;
export const SOLO_PACT_ENERGY = 2;
export const SPECTER_RANGE = 20;
/** Alone, the cards it draws instead. */
export const PLUNDER_CARDS = 2;
export const ENCHANT_TILES = 3;
export const ENCHANT_ADVANCE = 5;
/** Rounds (lost turns) an opponent stays stuck in the fairy's snow. */
export const ENCHANT_FREEZE = 2;
/** Tiles frozen per round. */
export const WINTER_TILES = 6;
/** Once winter has begun, the tiles the fairy's ability freezes, wherever she likes. */
export const WINTER_PICKS = 1;
/** Energy drained into the fairy per round stuck in her snow. */
export const SNOW_DRAIN = 1;
/** Eternal Flames: tiles lit, rounds they burn, scorches before one goes out. */
export const FLAME_TILES = 2;
export const FLAME_TURNS = 10;
export const FLAME_HITS = 2;
export const FLAME_ENERGY = 2;
export const FLAME_PUSH = 10;
/** Own turns, counting the one it's raised on. */
export const ARMOUR_TURNS = 3;
export const SERAPH_CARD_CHANCE = 0.5;
export const SUSANOO_PUSH = 1;
/** Things Zarek's Void holds at once. */
export const VOID_CAPACITY = 4;
/** Paid to set a harm down with its penalty doubled. */
export const VOID_DOUBLE_ENERGY = 2;
/** Own turns without the Void acting before it may take over another's spell on the board. */
export const VOID_IDLE_ROUNDS = 4;

export function needsDiscardChoice(ability: AbilityId | null): boolean {
  return ability === "resurrection";
}

/** Offered by the board rather than used from the button (the Void's seizing aside, see abilityBlocker). */
export function isReactive(ability: AbilityId): boolean {
  return ability === "theVoid" || ability === "silentVerdict";
}

export function isAbilityReady(player: Player): boolean {
  return player.ability !== null && player.abilityCharge >= abilityCycle(player.ability);
}

/** Shared by the UI's button and the engine; charged again the same turn (Ascension), it can be reused. */
export function abilityBlocker(player: Player): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  // Idle long enough, the Void may also be used to take over a spell on the board.
  if (isReactive(player.ability) && player.voidIdle < VOID_IDLE_ROUNDS) return "ABILITY_REACTIVE";
  if (player.ability === "theVoid" && player.voidHold.length >= VOID_CAPACITY) return "VOID_FULL";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
  if (needsDiscardChoice(player.ability) && player.discard.length === 0) return "EMPTY_DISCARD";
  if (needsDiscardChoice(player.ability) && player.hand.length >= HAND_LIMIT) return "HAND_FULL";
  return null;
}

export function cardsPerTurn(abilityInUse: AbilityId | null): number {
  return abilityInUse === "doubleCast" ? 2 : 1;
}

export function rollBonus(abilityInUse: AbilityId | null): number {
  return abilityInUse === "tailwind" ? TAILWIND_BONUS : 0;
}

export function rollMultiplier(abilityInUse: AbilityId | null): number {
  return abilityInUse === "dormantFury" ? DORMANT_FURY_MULTIPLIER : 1;
}

/** Untamed and held Time Warp don't charge, unless `fromBoard` (a charge tile always fills a turn). */
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
