import { CARD_CATALOG, type CardId, type Rarity } from "./cards";
import { GameRuleError } from "./commands";
import { playerIn, updatePlayer, type Draft } from "./draft";
import type { CardInstance, PlayerId } from "./types";

/** What a transmuted card can become: a rare or an epic, whatever it was. */
const TRANSMUTED_RARITIES: readonly Rarity[] = ["rare", "epic"];

/**
 * The cards `cardId` can transmute into: any rare or epic but itself, and no opponent-targeting
 * card when there's nobody to aim it at.
 */
export function transmutationPool(cardId: CardId, withOpponents: boolean): CardId[] {
  return Object.values(CARD_CATALOG)
    .filter(
      (definition) =>
        TRANSMUTED_RARITIES.includes(definition.rarity) &&
        definition.id !== cardId &&
        (withOpponents || !definition.targetsOpponent),
    )
    .map((definition) => definition.id);
}

/**
 * Transmutation: the chosen card in the player's hand becomes a random card from its pool, in
 * the same place in the hand. It's a new copy (a fresh uid), which stays in the deck from then on.
 */
export function transmuteCard(draft: Draft, playerId: PlayerId, cardUid: string | undefined): void {
  const from = playerIn(draft, playerId).hand.find((card) => card.uid === cardUid);
  if (!from) throw new GameRuleError("UNKNOWN_CARD");

  const pool = transmutationPool(from.cardId, draft.players.length > 1);
  if (pool.length === 0) return;
  const to: CardInstance = {
    uid: `${from.uid}~t`,
    cardId: pool[Math.floor(draft.random() * pool.length)],
  };
  updatePlayer(draft, playerId, (player) => ({
    hand: player.hand.map((card) => (card.uid === from.uid ? to : card)),
  }));
  draft.events.push({ type: "cardTransmuted", playerId, from, to });
}
