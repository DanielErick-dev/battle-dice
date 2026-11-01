import { GameRuleError, type GameErrorCode } from "../core/errors";
import { draftState, playerIn, type Draft } from "../core/draft";
import { crownAndFall } from "../characters/seraphiel/seraph";
import { endTurn } from "../core/turn";
import { feedTheVoid } from "../characters/zarek/void";
import type { GameState, Player, PlayerId } from "../types";
import type { GameTransition } from "./types";

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function assertCanAct(state: GameState, playerId: PlayerId): void {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  if (!state.players.some((player) => player.id === playerId)) throw new GameRuleError("UNKNOWN_PLAYER");
  if (currentPlayer(state).id !== playerId) throw new GameRuleError("NOT_YOUR_TURN");
  if (state.pendingDiscard) throw new GameRuleError("DISCARD_PENDING");
  if (state.pendingWard) throw new GameRuleError("WARD_PENDING");
  if (state.pendingGrace) throw new GameRuleError("GRACE_PENDING");
  if (state.pendingPlunder) throw new GameRuleError("PLUNDER_PENDING");
}

/** The paused prompt being answered, checked to exist and belong to the player. */
export function pendingAnswer<P>(
  state: GameState,
  pending: P | null,
  missing: GameErrorCode,
  isOwner: (pending: P) => boolean,
): P {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  if (!pending) throw new GameRuleError(missing);
  if (!isOwner(pending)) throw new GameRuleError("NOT_YOUR_TURN");
  return pending;
}

export const KEEPS_TURN = { endsTurn: false, extraTurn: false };

/** A win ends the game, a prompt pauses it, otherwise the turn ends if the command ends it. */
export function settle(
  draft: Draft,
  playerId: PlayerId,
  { endsTurn, extraTurn }: { endsTurn: boolean; extraTurn: boolean },
): GameTransition {
  const { state } = draft;
  crownAndFall(draft);
  feedTheVoid(draft);
  // A plunder waits for its Warden's pick across any other pause, then holds the turn itself.
  const pendingPlunder = draft.plunder ? { ...draft.plunder, endsTurn, extraTurn } : state.pendingPlunder;
  const paused = (pause: Partial<GameState>): GameTransition => ({
    state: { ...draftState(draft), ...pause, pendingPlunder },
    events: draft.events,
  });

  if (playerIn(draft, playerId).position === state.board.finishTile) {
    draft.events.push({ type: "playerWon", playerId });
    return {
      state: {
        ...draftState(draft),
        status: "finished",
        winnerId: playerId,
        pendingDiscard: null,
        pendingWard: null,
        pendingGrace: null,
        pendingPlunder: null,
      },
      events: draft.events,
    };
  }

  if (draft.pendingGrace) return paused({ pendingGrace: { playerId, ...draft.pendingGrace, endsTurn, extraTurn } });
  if (draft.pendingWard) return paused({ pendingWard: { playerId, ...draft.pendingWard, endsTurn, extraTurn } });

  const [overflow, ...queued] = draft.overflow;
  if (overflow) {
    const pendingDiscard = { playerId: overflow.playerId, drawn: overflow.card, queued, endsTurn, extraTurn };
    return paused({ pendingDiscard });
  }

  if (pendingPlunder) return paused({});

  // Stuck before rolling (a card or ability left them losing a turn): the turn is over there and then.
  const acting = currentPlayer(state);
  const stuck = playerIn(draft, acting.id).skipTurns > acting.skipTurns;
  if (!endsTurn && !stuck) return { state: draftState(draft), events: draft.events };

  const currentPlayerIndex = endTurn(draft, endsTurn ? extraTurn : state.bonusTurn || draft.extraTurn);
  return {
    state: {
      ...draftState(draft),
      currentPlayerIndex,
      turn: state.turn + 1,
      cardsPlayedThisTurn: 0,
      abilityInUse: null,
      bonusTurn: false,
    },
    events: draft.events,
  };
}
