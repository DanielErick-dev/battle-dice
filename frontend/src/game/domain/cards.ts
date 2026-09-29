export type CardId =
  | "windStep"
  | "healingHerb"
  | "arcaneShield"
  | "ancientScroll"
  | "luckyCharm"
  | "berserkFury"
  | "oracleEye"
  | "arcaneBlast"
  | "blindingFlash"
  | "mysticGate"
  | "fateRune"
  | "ancestralAwakening";

export type Rarity = "common" | "rare" | "epic";

export interface CardDefinition {
  id: CardId;
  rarity: Rarity;
  /** Needs an opponent as target; left out of solo decks. */
  targetsOpponent: boolean;
  /** Needs a die value (1–6) chosen when played. */
  needsValue: boolean;
  /** Changes the next roll(s): can't be played while another roll modifier is waiting. */
  boostsDice: boolean;
}

const card = (
  id: CardId,
  rarity: Rarity,
  traits: Partial<Omit<CardDefinition, "id" | "rarity">> = {},
): CardDefinition => ({
  id,
  rarity,
  targetsOpponent: false,
  needsValue: false,
  boostsDice: false,
  ...traits,
});

export const CARD_CATALOG: Readonly<Record<CardId, CardDefinition>> = {
  windStep: card("windStep", "common"),
  healingHerb: card("healingHerb", "common"),
  arcaneShield: card("arcaneShield", "common"),
  ancientScroll: card("ancientScroll", "common"),
  luckyCharm: card("luckyCharm", "common", { boostsDice: true }),
  berserkFury: card("berserkFury", "rare", { boostsDice: true }),
  oracleEye: card("oracleEye", "rare", { boostsDice: true }),
  arcaneBlast: card("arcaneBlast", "rare", { targetsOpponent: true }),
  blindingFlash: card("blindingFlash", "rare", { targetsOpponent: true }),
  mysticGate: card("mysticGate", "epic"),
  fateRune: card("fateRune", "epic", { needsValue: true, boostsDice: true }),
  ancestralAwakening: card("ancestralAwakening", "epic", { boostsDice: true }),
};

export const RARITY_COST: Readonly<Record<Rarity, number>> = {
  common: 1,
  rare: 2,
  epic: 3,
};

export const MAX_ENERGY = 5;
export const STARTING_ENERGY = 1;
/** A player gains 1 energy every this many of their own turns. */
export const TURNS_PER_ENERGY = 2;
export const HAND_LIMIT = 6;
export const STARTING_HAND = 4;
export const WIND_STEP_TILES = 3;
export const ARCANE_BLAST_PUSH = 3;
export const HEALING_HERB_ENERGY = 4;
export const ANCIENT_SCROLL_DRAWS = 2;
export const LUCKY_CHARM_BONUS = 2;
export const AWAKENING_BONUS = 3;
export const AWAKENING_ROLLS = 2;

/** Copies of each card in the standard deck, by rarity. */
export const COPIES_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 3,
  rare: 2,
  epic: 1,
};

export function cardCost(cardId: CardId): number {
  return RARITY_COST[CARD_CATALOG[cardId].rarity];
}

/**
 * The deck everyone plays with until collections exist: 22 cards solo, 26 with opponents.
 * Later, a player's own deck (built in the organiser from cards won on the roulette, daily
 * cards…) replaces it.
 */
export function standardDeck({ withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter((definition) => withOpponents || !definition.targetsOpponent)
    .flatMap((definition) => Array<CardId>(COPIES_BY_RARITY[definition.rarity]).fill(definition.id));
}
