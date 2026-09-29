import type { CardId } from "./cards";
import type { RandomSource } from "./random";
import type { CardInstance, PlayerId } from "./types";

/** Turns card ids into a shuffled pile of uniquely identified copies. */
export function buildDeck(playerId: PlayerId, cards: readonly CardId[], random: RandomSource): CardInstance[] {
  return shuffle(
    cards.map((cardId, index) => ({ uid: `${playerId}:${index}`, cardId })),
    random,
  );
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
