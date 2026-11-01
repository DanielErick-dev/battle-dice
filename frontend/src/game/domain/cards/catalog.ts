import type { AbilityId } from "@/game/domain/types";

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
  | "ascension"
  // Themis's own (see characters/themis/cards.ts).
  | "scalesOfJustice"
  | "swordOfLaw"
  | "weightOfGuilt"
  | "sacredBlindfold"
  // Zarek's own.
  | "voidHunger"
  | "hungryRift"
  | "voidEcho"
  | "riftCall";

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
  /** A character's own card: one copy in their deck only, playable only by whoever has this ability. */
  exclusive?: AbilityId;
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

  scalesOfJustice: card("scalesOfJustice", "epic", { exclusive: "silentVerdict", targetsOpponent: true }),
  swordOfLaw: card("swordOfLaw", "rare", { exclusive: "silentVerdict", targetsOpponent: true }),
  weightOfGuilt: card("weightOfGuilt", "uncommon", { exclusive: "silentVerdict", targetsOpponent: true }),
  sacredBlindfold: card("sacredBlindfold", "common", { exclusive: "silentVerdict" }),

  voidHunger: card("voidHunger", "uncommon", { exclusive: "theVoid" }),
  hungryRift: card("hungryRift", "rare", { exclusive: "theVoid" }),
  voidEcho: card("voidEcho", "epic", { exclusive: "theVoid" }),
  riftCall: card("riftCall", "epic", { exclusive: "theVoid", targetsOpponent: true }),
};

/** One kind per celestial tile. */
export const DIVINE_CARDS: readonly CardId[] = ["celestialLight", "heavenlyAegis", "ascension"];

export const RARITY_COST: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 2,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function rarityLevel(cardId: CardId): number {
  return RARITY_LEVEL[CARD_CATALOG[cardId].rarity];
}

export function cardCost(cardId: CardId): number {
  const definition = CARD_CATALOG[cardId];
  return definition.cost ?? RARITY_COST[definition.rarity];
}

/** Relics included, characters' own cards left out; opponent-targeting cards only `withOpponents`. */
export function cardsOfLevel(level: number, { withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter(
      (definition) =>
        RARITY_LEVEL[definition.rarity] === level &&
        !definition.exclusive &&
        (withOpponents || !definition.targetsOpponent),
    )
    .map((definition) => definition.id);
}
