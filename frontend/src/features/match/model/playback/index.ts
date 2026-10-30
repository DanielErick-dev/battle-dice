/** Turns each GameEvent into the steps the store plays in order; HANDLERS' type demands one per event (see README.md). */
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState } from "@/game/domain/types";
import { riftsOf } from "@/game/domain/void";
import type { PlaybackTimings } from "../../config";
import { sealViews, specterViews, type MatchView } from "../matchView";
import { turnSteps } from "./turn";
import { tilesSteps } from "./tiles";
import { cardsSteps } from "./cards";
import { abilitiesSteps } from "./abilities";
import { berserkerSteps } from "./berserker";
import { kunoichiSteps } from "./kunoichi";
import { fairySteps } from "./fairy";
import { seraphSteps } from "./seraph";
import { spectersSteps } from "./specters";
import { sealsSteps } from "./seals";
import { arrowRainSteps } from "./arrowRain";
import { cardGambleSteps } from "./cardGamble";
import { voidSteps } from "./void";
import { verdictSteps } from "./verdict";
import type { PlaybackStep, StepHandlers } from "./types";

export type { PlaybackStep } from "./types";

const HANDLERS: StepHandlers<GameEvent["type"]> = {
  ...turnSteps,
  ...tilesSteps,
  ...cardsSteps,
  ...abilitiesSteps,
  ...berserkerSteps,
  ...kunoichiSteps,
  ...fairySteps,
  ...seraphSteps,
  ...spectersSteps,
  ...sealsSteps,
  ...arrowRainSteps,
  ...cardGambleSteps,
  ...voidSteps,
  ...verdictSteps,
};

export function eventToSteps(event: GameEvent, timings: PlaybackTimings): PlaybackStep[] {
  const handler = HANDLERS[event.type] as (event: GameEvent, timings: PlaybackTimings) => PlaybackStep[];
  return handler(event, timings);
}

/** Battle log entries kept on the view; older ones drop off. */
export const LOG_LIMIT = 300;

/** Every step of an update, the sync last; each event is logged as its first step plays (see logged). */
export function updateSteps(events: readonly GameEvent[], state: GameState, timings: PlaybackTimings): PlaybackStep[] {
  const steps: PlaybackStep[] = [];
  let unlogged: GameEvent[] = [];
  for (const event of events) {
    unlogged.push(event);
    const [first, ...rest] = eventToSteps(event, timings);
    if (!first) continue;
    steps.push(logged(unlogged, first), ...rest);
    unlogged = [];
  }
  steps.push(logged(unlogged, syncStep(state)));
  return steps;
}

/** `step`, writing `events` into the battle log first: the log never runs ahead of the board, nor slows it. */
export function logged(events: readonly GameEvent[], step: PlaybackStep): PlaybackStep {
  if (events.length === 0) return step;
  return { ...step, apply: (view) => step.apply(events.reduce(logEvent, view)) };
}

function logEvent(view: MatchView, event: GameEvent): MatchView {
  if (event.type === "gameRestarted") return { ...view, log: [] };
  return { ...view, log: [...view.log, { id: (view.log.at(-1)?.id ?? 0) + 1, event }].slice(-LOG_LIMIT) };
}

/** Final step of every update: snaps the view onto the authoritative state; `fx` is left to finish playing. */
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
      cardsPlayedThisTurn: state.cardsPlayedThisTurn,
      abilityInUse: state.abilityInUse,
      pendingWard: state.pendingWard,
      pendingGrace: state.pendingGrace,
      destroyedTraps: state.destroyedTraps,
      pinnedTraps: state.pinnedTraps,
      seals: sealViews(state),
      specters: specterViews(state),
      enchantedTiles: state.enchantedTiles,
      blackFlames: state.blackFlames,
      winter: state.winter,
      rifts: riftsOf(state.board),
      pendingPlunder: state.pendingPlunder,
      walkEnd: null,
    }),
    durationMs: 0,
  };
}
