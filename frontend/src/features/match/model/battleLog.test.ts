import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board";
import { createGame } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import { DEFAULT_TIMINGS } from "../config";
import { createInitialView, type MatchView } from "./matchView";
import { LOG_LIMIT, eventToSteps, logged, updateSteps } from "./playback";

const initial = () =>
  createInitialView(
    createGame(CLASSIC_BOARD, [
      { id: "p1", name: "Aria" },
      { id: "p2", name: "Bjorn" },
    ]),
  );

const logAll = (view: MatchView, events: readonly GameEvent[]) =>
  logged(events, { apply: (current) => current, durationMs: 0 }).apply(view);

describe("battle log steps", () => {
  it("logs events in order", () => {
    const view = logAll(initial(), [
      { type: "turnChanged", playerId: "p2" },
      { type: "turnSkipped", playerId: "p2" },
    ]);
    expect(view.log.map((entry) => [entry.id, entry.event.type])).toEqual([
      [1, "turnChanged"],
      [2, "turnSkipped"],
    ]);
  });

  it("logs each event as its first step plays, adding no steps of its own", () => {
    const state = createGame(CLASSIC_BOARD, [{ id: "p1", name: "Aria" }]);
    const events: GameEvent[] = [
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p1" },
    ];
    const steps = updateSteps(events, state, DEFAULT_TIMINGS);
    const own = events.map((event) => eventToSteps(event, DEFAULT_TIMINGS).length);
    expect(steps).toHaveLength(own[0] + own[1] + 1);

    const views: MatchView[] = [];
    let view = createInitialView(state);
    for (const step of steps) views.push((view = step.apply(view)));
    expect(views[0].log.map((entry) => entry.event.type)).toEqual(["turnSkipped"]);
    expect(views[own[0]].log.map((entry) => entry.event.type)).toEqual(["turnSkipped", "turnChanged"]);
  });

  it("keeps only the latest LOG_LIMIT entries", () => {
    const events = Array.from({ length: LOG_LIMIT + 5 }, (): GameEvent => ({ type: "turnSkipped", playerId: "p1" }));
    const view = logAll(initial(), events);
    expect(view.log).toHaveLength(LOG_LIMIT);
    expect(view.log.at(-1)?.id).toBe(LOG_LIMIT + 5);
  });

  it("starts over with the match", () => {
    const view = logAll(initial(), [{ type: "turnSkipped", playerId: "p1" }, { type: "gameRestarted" }]);
    expect(view.log).toEqual([]);
  });
});
