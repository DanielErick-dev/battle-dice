import type { AbilityPower } from "../../abilities/ability";
import { CARD_CATALOG, RARITY_LEVEL, rarityLevel } from "../../cards/catalog";
import { throwOnPile } from "../../cards/decks";
import { opponentsInReach, opponentsInSpace, sameSpace } from "../../board/reach";
import type { DiceRoller } from "../../core/dice";
import { conjureCard, drawCard, handOverCards } from "../../cards/hand";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { GameRuleError } from "../../core/errors";
import { aimWard } from "../../core/playerStatus";
import { VERDICT_MULTIPLIER, judgeAim } from "../themis/verdict";
import type { Board } from "../../board/types";
import type { CardInstance, Player, PlayerId } from "../../core/state";

/** Card Gamble's die: this value or lower goes wrong. */
export const CARD_GAMBLE_LOSES_UP_TO = 2;
export const CARD_GAMBLE_STOLEN = 2;
export const CARD_GAMBLE_LOST = 1;
/** Alone on the board, a won Card Gamble draws instead. */
export const CARD_GAMBLE_DRAWS = 2;
/** This roll steals epics first; alone, it conjures CARD_GAMBLE_EPICS epics instead of drawing. */
export const CARD_GAMBLE_JACKPOT = 6;
export const CARD_GAMBLE_EPICS = 2;

/** Cards always move at random; a win against someone out of reach is blocked, but a loss still costs a card. */
export function playCardGamble(
  draft: Draft,
  playerId: PlayerId,
  rollDie: DiceRoller,
  targetId?: PlayerId,
  power?: AbilityPower,
): void {
  const { board } = draft.state;
  const reachable = opponentsInReach(board, draft.players, playerId);
  const targets = gambleTargets(board, draft.players, playerId);
  if (power === "fortune" && reachable.length > 0) throw new GameRuleError("INVALID_TARGET");
  if (targetId !== undefined && !targets.some((opponent) => opponent.id === targetId)) {
    throw new GameRuleError("INVALID_TARGET");
  }

  const value = rollDie();
  if (power === "fortune") {
    draft.events.push({ type: "gambleRolled", playerId, value, won: true, fortune: true });
    for (let draw = 0; draw < value; draw++) drawCard(draft, playerId);
    return;
  }
  const won = value > CARD_GAMBLE_LOSES_UP_TO;
  const jackpot = value >= CARD_GAMBLE_JACKPOT;
  draft.events.push({ type: "gambleRolled", playerId, value, won });

  if (draft.players.length === 1) {
    if (jackpot) conjureEpics(draft, playerId);
    else if (won) for (let draw = 0; draw < CARD_GAMBLE_DRAWS; draw++) drawCard(draft, playerId);
    else discardRandom(draft, playerId);
    return;
  }

  // Bet against someone out of reach: nobody on the other side to win from, and a loss still costs a card.
  const chosen = targets.find((opponent) => opponent.id === targetId);
  const shielded = chosen && !reachable.some((opponent) => opponent.id === chosen.id) ? chosen : undefined;
  if (shielded || reachable.length === 0) {
    if (!won) discardRandom(draft, playerId);
    else if (shielded) {
      const ward = sameSpace(board, shielded.position, playerIn(draft, playerId).position)
        ? (aimWard(shielded) ?? "away")
        : "away";
      draft.events.push({ type: "abilityBlocked", playerId, targetId: shielded.id, ability: "cardGamble", ward });
    }
    return;
  }

  if (won) {
    const holding = reachable.filter((opponent) => opponent.hand.length > 0);
    const withEpics = holding.filter((opponent) => opponent.hand.some(isEpic));
    const victim = chosen ?? pick(draft, jackpot && withEpics.length > 0 ? withEpics : holding);
    const judgeId = victim && judgeAim(draft, playerId, victim.id, { ability: "cardGamble" });
    if (judgeId) moveCards(draft, playerId, judgeId, CARD_GAMBLE_STOLEN * VERDICT_MULTIPLIER, jackpot);
    else if (victim) moveCards(draft, victim.id, playerId, CARD_GAMBLE_STOLEN, jackpot);
    return;
  }
  const taker = chosen ?? pick(draft, reachable);
  if (taker) moveCards(draft, playerId, taker.id, CARD_GAMBLE_LOST);
}

/** Opponents in the same place, armoured or not; with none to win from, every opponent. */
export function gambleTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  if (opponentsInReach(board, players, playerId).length > 0) return opponentsInSpace(board, players, playerId);
  return players.filter((player) => player.id !== playerId);
}

/** Fewer if the hand is smaller; `epicsFirst` takes epics while there are any. */
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

/** Alone on the board, so no opponent-targeting epics; they join the deck for good. */
function conjureEpics(draft: Draft, playerId: PlayerId): void {
  const pool = Object.values(CARD_CATALOG).filter(
    (definition) =>
      definition.rarity === "epic" && !definition.relic && !definition.exclusive && !definition.targetsOpponent,
  );
  for (let index = 0; index < CARD_GAMBLE_EPICS && pool.length > 0; index++) {
    const card: CardInstance = {
      uid: `${playerId}:jackpot${draft.state.turn}:${index}`,
      cardId: pool[Math.floor(draft.random() * pool.length)].id,
    };
    conjureCard(draft, playerId, card);
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
