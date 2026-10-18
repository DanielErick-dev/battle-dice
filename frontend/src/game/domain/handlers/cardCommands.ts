import { playCard } from "../cardPlay";
import { GameRuleError } from "../commands";
import { throwOnPile } from "../deck";
import { giveCard, playerIn, startDraft, updatePlayer } from "../draft";
import { fuseCards } from "../fusion";
import { assertCanAct, currentPlayer, KEEPS_TURN, pendingAnswer, settle } from "./shared";
import type { CommandHandlers } from "./types";

export const cardCommands: CommandHandlers<"playCard" | "discardCard" | "fuseCards"> = {
  playCard: (state, command, deps) => {
    const { playerId, cardUid } = command;
    assertCanAct(state, playerId);
    const draft = startDraft(state, deps.random);
    playCard(draft, playerId, cardUid, command);

    const settled = settle(draft, playerId, KEEPS_TURN);
    const bonusTurn = state.bonusTurn || draft.extraTurn;
    const cardsPlayedThisTurn = state.cardsPlayedThisTurn + 1;
    return { ...settled, state: { ...settled.state, cardsPlayedThisTurn, bonusTurn } };
  },

  discardCard: (state, { playerId, cardUid }, deps) => {
    const pending = pendingAnswer(
      state,
      state.pendingDiscard,
      "NO_DISCARD_PENDING",
      (pending) => pending.playerId === playerId,
    );

    const draft = startDraft({ ...state, pendingDiscard: null }, deps.random);
    const candidates = [...playerIn(draft, playerId).hand, pending.drawn];
    const card = candidates.find((candidate) => candidate.uid === cardUid);
    if (!card) throw new GameRuleError("UNKNOWN_CARD");

    const hand = candidates.filter((candidate) => candidate.uid !== cardUid);
    updatePlayer(draft, playerId, (player) => ({ hand, discard: throwOnPile(player.discard, [card]) }));
    draft.events.push({ type: "cardDiscarded", playerId, card, hand });
    // The next card waiting on a full hand comes in, asking for another discard if it still doesn't fit.
    for (const next of pending.queued) giveCard(draft, next.playerId, next.card);
    return settle(draft, currentPlayer(state).id, { endsTurn: pending.endsTurn, extraTurn: pending.extraTurn });
  },

  fuseCards: (state, { playerId, cardId }, deps) => {
    assertCanAct(state, playerId);
    const draft = startDraft(state, deps.random);
    fuseCards(draft, playerId, cardId);
    return settle(draft, playerId, KEEPS_TURN);
  },
};
