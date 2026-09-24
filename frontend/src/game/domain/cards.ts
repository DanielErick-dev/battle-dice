export type CardId =
  | "flyingNimbus"
  | "senzuBean"
  | "kiBarrier"
  | "kaioken"
  | "kamehameha"
  | "solarFlare"
  | "instantTransmission"
  | "dragonBall";

export type Rarity = "common" | "rare" | "epic";

export interface CardDefinition {
  id: CardId;
  rarity: Rarity;
  /** Needs an opponent as target; left out of solo decks. */
  targetsOpponent: boolean;
  /** Needs a die value (1–6) chosen when played. */
  needsValue: boolean;
}

export const CARD_CATALOG: Readonly<Record<CardId, CardDefinition>> = {
  flyingNimbus: { id: "flyingNimbus", rarity: "common", targetsOpponent: false, needsValue: false },
  senzuBean: { id: "senzuBean", rarity: "common", targetsOpponent: false, needsValue: false },
  kiBarrier: { id: "kiBarrier", rarity: "common", targetsOpponent: false, needsValue: false },
  kaioken: { id: "kaioken", rarity: "rare", targetsOpponent: false, needsValue: false },
  kamehameha: { id: "kamehameha", rarity: "rare", targetsOpponent: true, needsValue: false },
  solarFlare: { id: "solarFlare", rarity: "rare", targetsOpponent: true, needsValue: false },
  instantTransmission: { id: "instantTransmission", rarity: "epic", targetsOpponent: false, needsValue: false },
  dragonBall: { id: "dragonBall", rarity: "epic", targetsOpponent: false, needsValue: true },
};

export const RARITY_COST: Readonly<Record<Rarity, number>> = { common: 1, rare: 2, epic: 3 };

export const MAX_KI = 5;
export const STARTING_KI = 1;
export const HAND_LIMIT = 3;
export const STARTING_HAND = 1;
export const FLYING_NIMBUS_STEPS = 3;
export const KAMEHAMEHA_PUSH = 3;
export const SENZU_KI = 2;

/** Copies of each card in the standard deck, by rarity. */
const COPIES_BY_RARITY: Readonly<Record<Rarity, number>> = { common: 4, rare: 2, epic: 1 };

export function cardCost(cardId: CardId): number {
  return RARITY_COST[CARD_CATALOG[cardId].rarity];
}

/**
 * The deck everyone plays with until collections exist. Later, a player's own deck
 * (built in the organiser from cards won on the roulette, daily cards…) replaces it.
 */
export function standardDeck({ withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter((card) => withOpponents || !card.targetsOpponent)
    .flatMap((card) => Array<CardId>(COPIES_BY_RARITY[card.rarity]).fill(card.id));
}
