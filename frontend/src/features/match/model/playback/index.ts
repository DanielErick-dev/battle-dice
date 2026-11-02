/** Turns each GameEvent into the steps the store plays in order; HANDLERS' type demands one per event (see README.md). */
import { currentPlayer } from "@/game/domain/handlers/shared";
import type { GameEvent } from "@/game/domain/core/events";
import type { GameState } from "@/game/domain/types";
import { riftsOf } from "@/game/domain/characters/zarek/void";
import type { PlaybackTimings } from "../../config";
import { sealViews, specterViews, withPlayerAt, type MatchView } from "../matchView";
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
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    unlogged.push(event);
    const together = pushedTogether(events, index);
    if (together.length > 1) {
      unlogged.push(...together.slice(1));
      index += together.length - 1;
    }
    const [first, ...rest] = together.length > 1 ? pushSteps(together, timings) : eventToSteps(event, timings);
    if (!first) continue;
    steps.push(logged(unlogged, first), ...rest);
    unlogged = [];
  }
  steps.push(logged(unlogged, syncStep(state)));
  return steps;
}

type PushedEvent = Extract<GameEvent, { type: "playerPushed" }>;

/** The run of pushes by one player starting at `index` (an Arrow Rain's volley), knocked back side by side. */
function pushedTogether(events: readonly GameEvent[], index: number): PushedEvent[] {
  const first = events[index];
  if (first.type !== "playerPushed") return [];
  const run: PushedEvent[] = [first];
  for (let next = index + 1; next < events.length; next++) {
    const event = events[next];
    if (event.type !== "playerPushed" || event.by !== first.by || run.some((push) => push.playerId === event.playerId))
      break;
    run.push(event);
  }
  return run;
}

/** Every pushed player takes their next tile on the same beat, instead of one after another. */
function pushSteps(pushes: readonly PushedEvent[], timings: PlaybackTimings): PlaybackStep[] {
  const longest = Math.max(...pushes.map((push) => push.path.length));
  return Array.from({ length: longest }, (_, step) => ({
    apply: (view: MatchView) =>
      pushes.reduce((next, push) => {
        const tile = push.path[step];
        return tile === undefined ? next : withPlayerAt(next, push.playerId, tile);
      }, view),
    durationMs: timings.pushStepMs,
  }));
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
      voidScars: state.voidScars,
      pendingPlunder: state.pendingPlunder,
      walkEnd: null,
    }),
    durationMs: 0,
  };
}
