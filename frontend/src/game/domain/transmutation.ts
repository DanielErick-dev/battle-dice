import { TRANSMUTATION_CARDS, TRANSMUTATION_FALLBACK_LEVEL } from "./abilities";
import { cardsOfLevel, MAX_RARITY_LEVEL, rarityLevel, type CardId } from "./cards";
import { GameRuleError } from "./commands";
import { conjureCard, playerIn, updatePlayer, type Draft } from "./draft";
import type { CardInstance, PlayerId } from "./types";

/** Levels add up (two level-2 cards make a level 4), capped at the highest. */
export function transmutationLevel(cards: readonly CardId[]): number {
  return Math.min(
    MAX_RARITY_LEVEL,
    cards.reduce((sum, cardId) => sum + rarityLevel(cardId), 0),
  );
}

/** Falls back a level at a time when there's none to give (alone, a level of only opponent cards). */
export function transmutationPool(level: number, withOpponents: boolean): CardId[] {
  for (let wanted = level; wanted > 0; wanted--) {
    const pool = cardsOfLevel(wanted, { withOpponents });
    if (pool.length > 0) return pool;
  }
  return [];
}

/** The new card takes the first one's place and stays in the deck for good; the sacrificed ones are gone. */
export function transmuteCards(draft: Draft, playerId: PlayerId, cardUids: readonly string[]): void {
  const { hand } = playerIn(draft, playerId);
  const withOpponents = draft.players.length > 1;
  if (hand.length < TRANSMUTATION_CARDS) {
    distil(draft, playerId, withOpponents);
    return;
  }
  const chosen = cardUids.map((uid) => hand.find((card) => card.uid === uid));
  if (chosen.length !== TRANSMUTATION_CARDS || new Set(cardUids).size !== cardUids.length) {
    throw new GameRuleError("UNKNOWN_CARD");
  }
  const [from, sacrificed] = chosen;
  if (!from || !sacrificed) throw new GameRuleError("UNKNOWN_CARD");
  const pool = transmutationPool(transmutationLevel([from.cardId, sacrificed.cardId]), withOpponents);
  const to: CardInstance = { uid: `${from.uid}~t`, cardId: pool[Math.floor(draft.random() * pool.length)] };
  updatePlayer(draft, playerId, (player) => ({
    hand: player.hand.filter((card) => card.uid !== sacrificed.uid).map((card) => (card.uid === from.uid ? to : card)),
  }));
  draft.events.push({ type: "cardTransmuted", playerId, from, sacrificed, to });
}

function distil(draft: Draft, playerId: PlayerId, withOpponents: boolean): void {
  const pool = transmutationPool(TRANSMUTATION_FALLBACK_LEVEL, withOpponents);
  const card: CardInstance = {
    uid: `${playerId}:distilled${draft.state.turn}`,
    cardId: pool[Math.floor(draft.random() * pool.length)],
  };
  conjureCard(draft, playerId, card);
}
