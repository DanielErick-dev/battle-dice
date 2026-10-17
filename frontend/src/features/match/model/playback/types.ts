import type { GameEvent } from "@/game/domain/events";
import type { PlaybackTimings } from "../../config";
import type { MatchView } from "../matchView";

/** One beat of the story the screen tells: a change to the view, held for a while. */
export interface PlaybackStep {
  apply: (view: MatchView) => MatchView;
  durationMs: number;
}

export type EventOf<K extends GameEvent["type"]> = Extract<GameEvent, { type: K }>;

/** Turns each event of the given types into the steps that play it out. */
export type StepHandlers<K extends GameEvent["type"]> = {
  [T in K]: (event: EventOf<T>, timings: PlaybackTimings) => PlaybackStep[];
};
