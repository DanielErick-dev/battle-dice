import { TRANSMUTATION_CARDS, TRANSMUTATION_FALLBACK_LEVEL } from "./abilities";
import { cardsOfLevel, HAND_LIMIT, MAX_RARITY_LEVEL, rarityLevel, type CardId } from "./cards";
import { GameRuleError } from "./commands";
import { throwOnPile } from "./deck";
import { playerIn, updatePlayer, type Draft } from "./draft";
import type { CardInstance, PlayerId } from "./types";

/**
 * The rarity level sacrificing `cards` yields: their levels added up (two level-2 cards make a
 * level 4), up to the highest.
 */
export function transmutationLevel(cards: readonly CardId[]): number {
  return Math.min(
    MAX_RARITY_LEVEL,
    cards.reduce((sum, cardId) => sum + rarityLevel(cardId), 0),
  );
}

/**
 * What a transmutation into `level` can give: the cards of that level (relics too), falling back
 * a level at a time when there's none to give (alone, a level holding only opponent cards).
 */
export function transmutationPool(level: number, withOpponents: boolean): CardId[] {
  for (let wanted = level; wanted > 0; wanted--) {
    const pool = cardsOfLevel(wanted, { withOpponents });
    if (pool.length > 0) return pool;
  }
  return [];
}

/**
 * Transmutation: the player sacrifices TRANSMUTATION_CARDS cards from their hand and gets one
 * random card of their levels added up (see transmutationLevel), in the first one's place. It's a
 * new copy (a fresh uid), which stays in the deck from then on; the sacrificed cards are gone.
 * With fewer cards in hand there's nothing to sacrifice, so one card of
 * TRANSMUTATION_FALLBACK_LEVEL is distilled into it instead.
 */
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

/** A new random card of TRANSMUTATION_FALLBACK_LEVEL for a hand too thin to sacrifice from. */
function distil(draft: Draft, playerId: PlayerId, withOpponents: boolean): void {
  const pool = transmutationPool(TRANSMUTATION_FALLBACK_LEVEL, withOpponents);
  const card: CardInstance = {
    uid: `${playerId}:distilled${draft.state.turn}`,
    cardId: pool[Math.floor(draft.random() * pool.length)],
  };
  const { hand } = playerIn(draft, playerId);
  if (hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
  } else {
    updatePlayer(draft, playerId, (player) => ({ discard: throwOnPile(player.discard, [card]) }));
    draft.events.push({ type: "cardDiscarded", playerId, card, hand });
  }
}
