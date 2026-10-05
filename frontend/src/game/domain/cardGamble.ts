import {
  CARD_GAMBLE_DRAWS,
  CARD_GAMBLE_EPICS,
  CARD_GAMBLE_JACKPOT,
  CARD_GAMBLE_LOSES_UP_TO,
  CARD_GAMBLE_LOST,
  CARD_GAMBLE_STOLEN,
} from "./abilities";
import { CARD_CATALOG, HAND_LIMIT, RARITY_LEVEL, rarityLevel } from "./cards";
import { throwOnPile } from "./deck";
import { opponentsInReach } from "./board";
import type { DiceRoller } from "./dice";
import { drawCard, handOverCards, playerIn, updatePlayer, type Draft } from "./draft";
import { GameRuleError } from "./commands";
import type { CardInstance, PlayerId } from "./types";

/**
 * Card Gamble: the player bets against an opponent (`targetId`, picked before the roll; one at
 * random when not given) and rolls a die of fortune. Up to CARD_GAMBLE_LOSES_UP_TO it goes wrong,
 * a random card of theirs goes to that opponent; above, they steal CARD_GAMBLE_STOLEN random cards
 * from them. Nobody picks the cards: they come out at random.
 * Alone on the board, a loss throws the card away and a win draws CARD_GAMBLE_DRAWS cards.
 * The jackpot (CARD_GAMBLE_JACKPOT) beats any win: the stolen cards are epics first (from an
 * opponent holding some, when anyone does), topped up with random ones; alone on the board,
 * CARD_GAMBLE_EPICS random epic cards appear in the player's hand instead.
 */
export function playCardGamble(draft: Draft, playerId: PlayerId, rollDie: DiceRoller, targetId?: PlayerId): void {
  const opponents = opponentsInReach(draft.state.board, draft.players, playerId);
  if (targetId !== undefined && !opponents.some((opponent) => opponent.id === targetId)) {
    throw new GameRuleError("INVALID_TARGET");
  }

  const value = rollDie();
  const won = value > CARD_GAMBLE_LOSES_UP_TO;
  const jackpot = value >= CARD_GAMBLE_JACKPOT;
  draft.events.push({ type: "gambleRolled", playerId, value, won });

  // With nobody to bet against, as if alone.
  if (opponents.length === 0) {
    if (jackpot) conjureEpics(draft, playerId);
    else if (won) for (let draw = 0; draw < CARD_GAMBLE_DRAWS; draw++) drawCard(draft, playerId);
    else discardRandom(draft, playerId);
    return;
  }

  if (won) {
    const holding = opponents.filter((opponent) => opponent.hand.length > 0);
    const withEpics = holding.filter((opponent) => opponent.hand.some(isEpic));
    const victim =
      opponents.find((opponent) => opponent.id === targetId) ??
      pick(draft, jackpot && withEpics.length > 0 ? withEpics : holding);
    if (victim) moveCards(draft, victim.id, playerId, CARD_GAMBLE_STOLEN, jackpot);
    return;
  }
  const taker = opponents.find((opponent) => opponent.id === targetId) ?? pick(draft, opponents);
  if (taker) moveCards(draft, playerId, taker.id, CARD_GAMBLE_LOST);
}

/**
 * `count` random cards (fewer if there aren't as many) leave `from`'s hand for `to`'s (see
 * handOverCards). `epicsFirst` takes epics while there are any, then random others.
 */
function moveCards(draft: Draft, from: PlayerId, to: PlayerId, count: number, epicsFirst = false): void {
  const hand = playerIn(draft, from).hand;
  const piles = epicsFirst ? [hand.filter(isEpic), hand.filter((card) => !isEpic(card))] : [[...hand]];
  const cards: CardInstance[] = [];
  for (const pile of piles) {
    while (cards.length < count && pile.length > 0) {
      cards.push(...pile.splice(Math.floor(draft.random() * pile.length), 1));
    }
  }
  handOverCards(draft, from, to, cards);
}

/** Epic or better: what the jackpot goes after. */
function isEpic(card: CardInstance): boolean {
  return rarityLevel(card.cardId) >= RARITY_LEVEL.epic;
}

/**
 * CARD_GAMBLE_EPICS new random epic cards for a player alone on the board (so none aimed at an
 * opponent). They join the deck from then on; what finds the hand full is discarded.
 */
function conjureEpics(draft: Draft, playerId: PlayerId): void {
  const pool = Object.values(CARD_CATALOG).filter(
    (definition) => definition.rarity === "epic" && !definition.relic && !definition.targetsOpponent,
  );
  for (let index = 0; index < CARD_GAMBLE_EPICS && pool.length > 0; index++) {
    const card: CardInstance = {
      uid: `${playerId}:jackpot${draft.state.turn}:${index}`,
      cardId: pool[Math.floor(draft.random() * pool.length)].id,
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
