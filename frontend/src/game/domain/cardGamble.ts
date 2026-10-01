import { CARD_GAMBLE_DRAWS, CARD_GAMBLE_LOSES_UP_TO, CARD_GAMBLE_LOST, CARD_GAMBLE_STOLEN } from "./abilities";
import { throwOnPile } from "./deck";
import { sameSpace } from "./board";
import type { DiceRoller } from "./dice";
import { drawCard, handOverCards, playerIn, updatePlayer, type Draft } from "./draft";
import type { CardInstance, PlayerId } from "./types";

/**
 * Card Gamble: the player rolls a die of fortune. Up to CARD_GAMBLE_LOSES_UP_TO it goes wrong, a
 * random card of theirs goes to a random opponent; above, they steal CARD_GAMBLE_STOLEN random
 * cards from a random opponent holding any. Nobody picks the cards: they come out at random.
 * Alone on the board, a loss throws the card away and a win draws CARD_GAMBLE_DRAWS cards.
 */
export function playCardGamble(draft: Draft, playerId: PlayerId, rollDie: DiceRoller): void {
  const value = rollDie();
  const won = value > CARD_GAMBLE_LOSES_UP_TO;
  draft.events.push({ type: "gambleRolled", playerId, value, won });

  // Only opponents in the same place (main path or realm track) can be reached; with none, as if alone.
  const { board } = draft.state;
  const here = playerIn(draft, playerId).position;
  const opponents = draft.players.filter(
    (player) => player.id !== playerId && sameSpace(board, player.position, here),
  );
  if (opponents.length === 0) {
    if (won) for (let draw = 0; draw < CARD_GAMBLE_DRAWS; draw++) drawCard(draft, playerId);
    else discardRandom(draft, playerId);
    return;
  }

  if (won) {
    const victim = pick(
      draft,
      opponents.filter((opponent) => opponent.hand.length > 0),
    );
    if (victim) moveCards(draft, victim.id, playerId, CARD_GAMBLE_STOLEN);
    return;
  }
  const taker = pick(draft, opponents);
  if (taker) moveCards(draft, playerId, taker.id, CARD_GAMBLE_LOST);
}

/**
 * `count` random cards (fewer if there aren't as many) leave `from`'s hand for `to`'s (see
 * handOverCards).
 */
function moveCards(draft: Draft, from: PlayerId, to: PlayerId, count: number): void {
  const hand = [...playerIn(draft, from).hand];
  const cards: CardInstance[] = [];
  while (cards.length < count && hand.length > 0) {
    cards.push(...hand.splice(Math.floor(draft.random() * hand.length), 1));
  }
  handOverCards(draft, from, to, cards);
}

function discardRandom(draft: Draft, playerId: PlayerId): void {
  const { hand } = playerIn(draft, playerId);
  if (hand.length === 0) return;
  const card = hand[Math.floor(draft.random() * hand.length)];
  const rest = hand.filter((candidate) => candidate.uid !== card.uid);
  updatePlayer(draft, playerId, (player) => ({ hand: rest, discard: throwOnPile(player.discard, [card]) }));
  draft.events.push({ type: "cardDiscarded", playerId, card, hand: rest });
}

function pick<T>(draft: Draft, options: readonly T[]): T | undefined {
  return options[Math.floor(draft.random() * options.length)];
}
