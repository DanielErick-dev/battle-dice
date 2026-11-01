import { CARD_CATALOG, type Rarity } from "./catalog";
import { shuffle, type RandomSource } from "../core/random";
import type { AbilityId, CardId, CardInstance, PlayerId } from "@/game/domain/types";

/** Copies per card in the standard deck (relics are never in it). */
export const COPIES_BY_RARITY: Readonly<Record<Rarity, number>> = {
  common: 3,
  uncommon: 2,
  rare: 2,
  epic: 1,
  legendary: 1,
};

/** Everyone's deck until collections exist: 20 cards solo, 26 with opponents. */
export function standardDeck({ withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter(
      (definition) => !definition.relic && !definition.exclusive && (withOpponents || !definition.targetsOpponent),
    )
    .flatMap((definition) => Array<CardId>(COPIES_BY_RARITY[definition.rarity]).fill(definition.id));
}

/** A character's own cards, one copy each, shuffled into the standard deck of whoever has `ability`. */
export function exclusiveCards(ability: AbilityId | null, { withOpponents }: { withOpponents: boolean }): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter(
      (definition) =>
        ability !== null && definition.exclusive === ability && (withOpponents || !definition.targetsOpponent),
    )
    .map((definition) => definition.id);
}

/** The deck a player starts with when the match doesn't hand one in. */
export function characterDeck(ability: AbilityId | null, options: { withOpponents: boolean }): CardId[] {
  return [...standardDeck(options), ...exclusiveCards(ability, options)];
}

export function buildDeck(playerId: PlayerId, cards: readonly CardId[], random: RandomSource): CardInstance[] {
  return shuffle(
    cards.map((cardId, index) => ({ uid: `${playerId}:${index}`, cardId })),
    random,
  );
}

/** Risen cards (Resurrection) crumble instead, gone from the game. */
export function throwOnPile(pile: readonly CardInstance[], cards: readonly CardInstance[]): CardInstance[] {
  return [...pile, ...cards.filter((card) => !card.risen)];
}
