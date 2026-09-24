import type { CardId } from "./cards";
import type { RandomSource } from "./random";
import type { CardInstance, PlayerId } from "./types";

/** Turns card ids into a shuffled pile of uniquely identified copies (Fisher–Yates). */
export function buildDeck(playerId: PlayerId, cards: readonly CardId[], random: RandomSource): CardInstance[] {
  const deck = cards.map((cardId, index) => ({ uid: `${playerId}:${index}`, cardId }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
