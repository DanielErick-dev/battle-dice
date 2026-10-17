/**
 * Playback: the engine hands over the new state at once, but the screen has to tell the story in
 * order: the die spins, the figure walks tile by tile, the trap goes off. Each GameEvent becomes a
 * list of PlaybackSteps that the match store plays one after another (see docs/arquitetura.md).
 *
 * The handlers live in one file per theme, named after the domain files they mirror. HANDLERS'
 * type demands one for every GameEvent, so a new event doesn't compile until it has its steps.
 */
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState } from "@/game/domain/types";
import type { PlaybackTimings } from "../../config";
import { sealViews, specterViews } from "../matchView";
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
};

export function eventToSteps(event: GameEvent, timings: PlaybackTimings): PlaybackStep[] {
  const handler = HANDLERS[event.type] as (event: GameEvent, timings: PlaybackTimings) => PlaybackStep[];
  return handler(event, timings);
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
      pendingPlunder: state.pendingPlunder,
    }),
    durationMs: 0,
  };
}
