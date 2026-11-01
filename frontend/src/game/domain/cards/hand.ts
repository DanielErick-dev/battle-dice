import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { shuffle } from "../core/random";
import { throwOnPile } from "./decks";
import type { CardInstance, PlayerId } from "@/game/domain/types";

export const HAND_LIMIT = 8;
export const STARTING_HAND = 6;

/** An empty deck is first rebuilt from the shuffled discard pile. */
export function drawCard(draft: Draft, playerId: PlayerId): void {
  if (playerIn(draft, playerId).deck.length === 0) reshuffleDiscard(draft, playerId);

  const [card, ...deck] = playerIn(draft, playerId).deck;
  if (!card) return;
  updatePlayer(draft, playerId, () => ({ deck }));
  giveCard(draft, playerId, card);
}

/** A full hand queues the card as overflow, so none is ever lost without the player's choice. */
export function giveCard(draft: Draft, playerId: PlayerId, card: CardInstance): void {
  const waiting = draft.overflow.some((overflow) => overflow.playerId === playerId);
  if (!waiting && playerIn(draft, playerId).hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
    return;
  }
  if (draft.overflow.length === 0) draft.events.push({ type: "discardRequired", playerId, card });
  draft.overflow.push({ playerId, card });
}

/** A brand-new card: into the hand, or straight onto the discard pile when it's full (no discard prompt). */
export function conjureCard(draft: Draft, playerId: PlayerId, card: CardInstance): void {
  const { hand } = playerIn(draft, playerId);
  if (hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
  } else {
    updatePlayer(draft, playerId, (player) => ({ discard: throwOnPile(player.discard, [card]) }));
    draft.events.push({ type: "cardDiscarded", playerId, card, hand });
  }
}

function reshuffleDiscard(draft: Draft, playerId: PlayerId): void {
  const { discard } = playerIn(draft, playerId);
  if (discard.length === 0) return;
  updatePlayer(draft, playerId, () => ({
    deck: shuffle(discard, draft.random),
    discard: [],
  }));
  draft.events.push({ type: "deckReshuffled", playerId, size: discard.length });
}

/** Cards that don't fit `to`'s hand wait as overflow for them to make room. */
export function handOverCards(draft: Draft, from: PlayerId, to: PlayerId, cards: readonly CardInstance[]): void {
  if (cards.length === 0) return;
  const room = draft.overflow.some((overflow) => overflow.playerId === to)
    ? 0
    : Math.max(0, HAND_LIMIT - playerIn(draft, to).hand.length);
  const kept = cards.slice(0, room);
  const taken = new Set(cards.map((card) => card.uid));
  updatePlayer(draft, from, (player) => ({ hand: player.hand.filter((held) => !taken.has(held.uid)) }));
  updatePlayer(draft, to, (player) => ({ hand: [...player.hand, ...kept] }));
  draft.events.push({ type: "cardsStolen", playerId: to, from, cards: [...kept], discarded: [] });
  for (const card of cards.slice(room)) giveCard(draft, to, card);
}

/** A random hand card onto the discard pile, silently (null with an empty hand, drawing no number). */
export function takeRandomCard(draft: Draft, playerId: PlayerId): CardInstance | null {
  const { hand } = playerIn(draft, playerId);
  if (hand.length === 0) return null;
  const card = hand[Math.floor(draft.random() * hand.length)];
  updatePlayer(draft, playerId, (player) => ({
    hand: player.hand.filter((candidate) => candidate.uid !== card.uid),
    discard: throwOnPile(player.discard, [card]),
  }));
  return card;
}

/** A random hand card thrown away, for all to see. */
export function discardRandom(draft: Draft, playerId: PlayerId): void {
  const card = takeRandomCard(draft, playerId);
  if (card) draft.events.push({ type: "cardDiscarded", playerId, card, hand: playerIn(draft, playerId).hand });
}
