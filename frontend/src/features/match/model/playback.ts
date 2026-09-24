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
    }),
    durationMs: 0,
  };
}
