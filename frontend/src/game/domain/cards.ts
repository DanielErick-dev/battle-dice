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
  | "ancestralAwakening"
  | "fateSwap"
  | "abyssCall"
  | "celestialLight"
  | "heavenlyAegis"
  | "ascension";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LEVEL: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};
export const MAX_RARITY_LEVEL = RARITY_LEVEL.legendary;

export interface CardDefinition {
  id: CardId;
  rarity: Rarity;
  /** Heaven's relics: never in a deck, only found lying on celestial tiles. */
  relic: boolean;
  /** Needs an opponent as target; left out of solo decks. */
  targetsOpponent: boolean;
  /** Needs a die value (1–6) chosen when played. */
  needsValue: boolean;
  /** One "throw" and one "bonus" may wait for the roll together (a combo), never two of a kind. */
  dice: "throw" | "bonus" | null;
  /** Overrides RARITY_COST. */
  cost?: number;
}

const card = (
  id: CardId,
  rarity: Rarity,
  traits: Partial<Omit<CardDefinition, "id" | "rarity">> = {},
): CardDefinition => ({
  id,
  rarity,
  relic: false,
  targetsOpponent: false,
  needsValue: false,
  dice: null,
  ...traits,
});

export const CARD_CATALOG: Readonly<Record<CardId, CardDefinition>> = {
  windStep: card("windStep", "common"),
  healingHerb: card("healingHerb", "common"),
  luckyCharm: card("luckyCharm", "common", { dice: "bonus" }),
  arcaneShield: card("arcaneShield", "uncommon"),
  ancientScroll: card("ancientScroll", "uncommon"),
  oracleEye: card("oracleEye", "uncommon", { dice: "throw" }),
  arcaneBlast: card("arcaneBlast", "uncommon", { targetsOpponent: true }),
  berserkFury: card("berserkFury", "rare", { dice: "throw" }),
  blindingFlash: card("blindingFlash", "rare", { targetsOpponent: true }),
  mysticGate: card("mysticGate", "epic"),
  fateRune: card("fateRune", "epic", { needsValue: true, dice: "throw" }),
  ancestralAwakening: card("ancestralAwakening", "epic", { dice: "bonus" }),
  // Hell's Drag in a card: only on a board with hell, at someone out on the main path.
  abyssCall: card("abyssCall", "epic", { targetsOpponent: true }),
  // Swapping places can win a race outright: it takes a full bar of energy.
  fateSwap: card("fateSwap", "legendary", { targetsOpponent: true, cost: 10 }),
  // Heaven's gifts are cheap to play: the hard part is reaching them.
  celestialLight: card("celestialLight", "legendary", { relic: true, cost: 0 }),
  heavenlyAegis: card("heavenlyAegis", "legendary", { relic: true, cost: 2 }),
  ascension: card("ascension", "legendary", { relic: true, cost: 2 }),
};

/** One kind per celestial tile. */
export const DIVINE_CARDS: readonly CardId[] = ["celestialLight", "heavenlyAegis", "ascension"];
/** Own turns, counting the one it's played in. */
export const AEGIS_TURNS = 3;

export const RARITY_COST: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 2,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const MAX_ENERGY = 10;
export const STARTING_ENERGY = 1;
/** Own turns per energy gained. */
export const TURNS_PER_ENERGY = 2;
export const HAND_LIMIT = 8;
export const STARTING_HAND = 6;
export const WIND_STEP_TILES = 3;
export const ARCANE_BLAST_PUSH = 7;
export const HEALING_HERB_ENERGY = 6;
export const ANCIENT_SCROLL_DRAWS = 2;
export const LUCKY_CHARM_BONUS = 2;
export const AWAKENING_BONUS = 3;
export const AWAKENING_ROLLS = 2;

/** Copies per card in the standard deck (relics are never in it). */
export const COPIES_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 3,
  uncommon: 2,
  rare: 2,
  epic: 1,
  legendary: 1,
};

export function rarityLevel(cardId: CardId): number {
  return RARITY_LEVEL[CARD_CATALOG[cardId].rarity];
}

/** Relics included; opponent-targeting cards only `withOpponents`. */
export function cardsOfLevel(level: number, { withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter((definition) => RARITY_LEVEL[definition.rarity] === level && (withOpponents || !definition.targetsOpponent))
    .map((definition) => definition.id);
}

export function cardCost(cardId: CardId): number {
  const definition = CARD_CATALOG[cardId];
  return definition.cost ?? RARITY_COST[definition.rarity];
}

/** Everyone's deck until collections exist: 20 cards solo, 26 with opponents. */
export function standardDeck({ withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter((definition) => !definition.relic && (withOpponents || !definition.targetsOpponent))
    .flatMap((definition) => Array<CardId>(COPIES_BY_RARITY[definition.rarity]).fill(definition.id));
}
