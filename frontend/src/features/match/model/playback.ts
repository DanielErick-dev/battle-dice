import { DICE_SIDES } from "@/game/domain/dice";
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState } from "@/game/domain/types";
import type { PlaybackTimings } from "../config";
import { withPlayerAt, type MatchView } from "./matchView";

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
            lastRoll: null,
            roll: { id: (view.roll?.id ?? 0) + 1, value: event.value },
            poweredPlayerId: event.value === DICE_SIDES ? event.playerId : null,
            effect: null,
            movingPlayerId: event.playerId,
          }),
          durationMs: timings.diceRollMs,
        },
        {
          apply: (view) => ({ ...view, isRolling: false, lastRoll: event.value }),
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

    case "playerWon":
      return [{ apply: (view) => ({ ...view, winnerId: event.playerId }), durationMs: 0 }];

    case "turnChanged":
      return [{ apply: (view) => ({ ...view, activePlayerId: event.playerId }), durationMs: 0 }];

    case "gameRestarted":
      return [
        {
          apply: (view) => ({ ...view, lastRoll: null, effect: null, winnerId: null }),
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
    }),
    durationMs: 0,
  };
}
