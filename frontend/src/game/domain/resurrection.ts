import { RESURRECTION_CARDS } from "./abilities";
import { HAND_LIMIT } from "./cards";
import { GameRuleError } from "./commands";
import { playerIn, updatePlayer, type Draft } from "./draft";
import type { PlayerId } from "./types";

/** No more than the hand has room for; they come back risen, gone for good once they leave it again. */
export function resurrectCards(draft: Draft, playerId: PlayerId, cardUids: readonly string[]): void {
  const player = playerIn(draft, playerId);
  const picked = new Set(cardUids);
  if (picked.size === 0 || picked.size !== cardUids.length) throw new GameRuleError("UNKNOWN_CARD");
  if (picked.size > Math.min(RESURRECTION_CARDS, HAND_LIMIT - player.hand.length)) {
    throw new GameRuleError("TOO_MANY_CARDS");
  }
  const cards = cardUids.map((uid) => player.discard.find((card) => card.uid === uid));
  if (cards.some((card) => !card)) throw new GameRuleError("UNKNOWN_CARD");

  const raised = cards.filter((card) => card !== undefined).map((card) => ({ ...card, risen: true }));
  updatePlayer(draft, playerId, (current) => ({
    hand: [...current.hand, ...raised],
    discard: current.discard.filter((card) => !picked.has(card.uid)),
  }));
  draft.events.push({ type: "cardsResurrected", playerId, cards: raised });
}
