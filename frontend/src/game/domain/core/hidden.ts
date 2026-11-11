import type { CardId } from "../cards/catalog";
import type { CardInstance } from "./state";

/** What a projected state (see projection.ts) shows in place of something this viewer may not see. */
export const HIDDEN = "hidden";
export type Hidden = typeof HIDDEN;

// Keeps the CardInstance shape so hands and decks still count and list; the id is outside CARD_CATALOG on purpose.
const HIDDEN_CARD_ID = HIDDEN as unknown as CardId;

/** A face-down card: its position in the list is all it tells. */
export function hiddenCard(index: number): CardInstance {
  return { uid: `${HIDDEN}:${index}`, cardId: HIDDEN_CARD_ID };
}

export function hideCards(cards: readonly CardInstance[]): CardInstance[] {
  return cards.map((_, index) => hiddenCard(index));
}

/** Another player's card in a projected state: only count it, never look it up in CARD_CATALOG. */
export function isHiddenCard(card: CardInstance): boolean {
  return card.cardId === HIDDEN_CARD_ID;
}
