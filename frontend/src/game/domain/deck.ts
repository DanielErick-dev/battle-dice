import type { CardId } from "./cards";
import { shuffle, type RandomSource } from "./random";
import type { CardInstance, PlayerId } from "./types";

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
