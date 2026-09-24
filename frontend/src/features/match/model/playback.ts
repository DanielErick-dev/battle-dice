import { cardCost } from "@/game/domain/cards";
import { DICE_SIDES } from "@/game/domain/dice";
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState } from "@/game/domain/types";
import type { PlaybackTimings } from "../config";
import { withPlayer, withPlayerAt, type MatchView } from "./matchView";

export interface PlaybackStep {
  apply: (view: MatchView) => MatchView;
  durationMs: number;
}

export function eventToSteps(event: GameEvent, timings: PlaybackTimings): PlaybackStep[] {
  switch (event.type) {
    case "diceRolled":
      return [
        {
          apply: (view) => ({
            ...view,
            isRolling: true,
            lastRoll: [],
            roll: { id: (view.roll?.id ?? 0) + 1, dice: event.dice },
            poweredPlayerId: event.dice.includes(DICE_SIDES) ? event.playerId : null,
            effect: null,
            movingPlayerId: event.playerId,
          }),
          durationMs: timings.diceRollMs,
        },
        {
          apply: (view) => ({ ...view, isRolling: false, lastRoll: event.dice }),
          durationMs: timings.diceRevealMs,
        },
      ];

    case "playerMoved":
      return event.path.map((tile) => ({
        apply: (view) => withPlayerAt(view, event.playerId, tile),
        durationMs: timings.stepMs,
      }));

    case "portalEntered":
    case "trapTriggered": {
      const kind = event.type === "portalEntered" ? "portal" : "trap";
      return [
        {
          apply: (view) => ({ ...view, effect: { kind, ...event } }),
          durationMs: timings.effectWarmupMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];
    }

    case "advanceTriggered":
      // The walk itself comes as the next playerMoved event.
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "advance", ...event }, poweredPlayerId: event.playerId }),
          durationMs: timings.effectWarmupMs,
        },
      ];

    case "extraTurnGranted":
    case "skipTurnGained": {
      const kind = event.type === "extraTurnGranted" ? "extraTurn" : "skipTurn";
      const effect = { kind, playerId: event.playerId, from: event.tile, to: event.tile } as const;
      return [{ apply: (view) => ({ ...view, effect }), durationMs: timings.noticeMs }];
    }

    case "turnSkipped":
      return [
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
            return { ...view, effect: { kind: "turnSkipped", playerId: event.playerId, from: tile, to: tile } };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardTeleported":
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "teleport", ...event } }),
          durationMs: timings.effectWarmupMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];

    case "trapBlocked": {
      const effect = { kind: "trapBlocked", playerId: event.playerId, from: event.tile, to: event.tile } as const;
      return [{ apply: (view) => ({ ...view, effect }), durationMs: timings.noticeMs }];
    }

    case "playerPushed":
      return event.path.map((tile) => ({
        apply: (view) => withPlayerAt(view, event.playerId, tile),
        durationMs: timings.pushStepMs,
      }));

    case "cardDrawn":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, event.card] })),
            lastDrawnUid: event.card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "discardRequired":
      return [
        {
          apply: (view) => ({ ...view, pendingDiscard: { playerId: event.playerId, drawn: event.card } }),
          durationMs: 0,
        },
      ];

    case "cardDiscarded":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, () => ({ hand: event.hand })),
            pendingDiscard: null,
          }),
          durationMs: timings.drawMs / 2,
        },
      ];

    case "cardPlayed":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => card.uid !== event.card.uid),
              ki: player.ki - cardCost(event.card.cardId),
            })),
            cast: { id: (view.cast?.id ?? 0) + 1, ...event },
            cardPlayedThisTurn: true,
            effect: null,
          }),
          durationMs: timings.castMs,
        },
      ];

    case "playerWon":
      return [{ apply: (view) => ({ ...view, winnerId: event.playerId }), durationMs: 0 }];

    case "turnChanged":
      return [{ apply: (view) => ({ ...view, activePlayerId: event.playerId }), durationMs: 0 }];

    case "gameRestarted":
      return [
        {
          apply: (view) => ({
            ...view,
            lastRoll: [],
            effect: null,
            winnerId: null,
            cast: null,
            lastDrawnUid: null,
            pendingDiscard: null,
          }),
          durationMs: 0,
        },
      ];
  }
}

/** Final step of every update: snaps the view onto the authoritative state. */
export function syncStep(state: GameState): PlaybackStep {
  return {
    apply: (view) => ({
      ...view,
      players: state.players,
      activePlayerId: currentPlayer(state).id,
      winnerId: state.winnerId,
      movingPlayerId: null,
      poweredPlayerId: null,
      pendingDiscard: state.pendingDiscard,
      cardPlayedThisTurn: state.cardPlayedThisTurn,
    }),
    durationMs: 0,
  };
}
