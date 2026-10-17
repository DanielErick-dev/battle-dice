/** Bjorn: Untamed and his trample. */
import { withPlayer, withPlayerAt, type MatchView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const berserkerSteps: StepHandlers<"untamedUnleashed" | "playerTrampled"> = {
  untamedUnleashed: (event) => {
    return [
      {
        apply: (view) =>
          withPlayer(view, event.playerId, () => ({
            untamed: event.turns,
            reversedRolls: 0,
          })),
        durationMs: 0,
      },
    ];
  },
  playerTrampled: (event, timings) => {
    // The Berserker turns on them and shoves; they fly back to where the knock-back leaves them,
    // and he turns back to run on.
    const trample = {
      by: event.by,
      victim: event.playerId,
      tile: event.tile,
    };
    // Caught sitting out a lost turn on their chair, they get up first.
    const getUp = {
      apply: (view: MatchView) => ({
        ...view,
        trample: { id: (view.trample?.id ?? 0) + 1, ...trample, phase: "rise" as const },
      }),
      durationMs: timings.trampleRiseMs,
    };
    return [
      ...(event.seated ? [getUp] : []),
      {
        apply: (view) => ({
          ...view,
          trample: {
            id: view.trample?.phase === "rise" ? view.trample.id : (view.trample?.id ?? 0) + 1,
            ...trample,
            phase: "shove",
          },
        }),
        durationMs: timings.trampleShoveMs,
      },
      {
        apply: (view) => ({
          ...withPlayerAt(view, event.playerId, event.path.at(-1) ?? event.tile),
          trample: view.trample && { ...view.trample, phase: "flying" },
          effect: {
            ...playerTileEffect(view, event.playerId, "trampled"),
            count: event.path.length,
          },
        }),
        durationMs: timings.trampleFlightMs,
      },
      {
        apply: (view) => ({
          ...view,
          trample: view.trample && { ...view.trample, phase: "over" },
        }),
        durationMs: timings.trampleRecoverMs,
      },
    ];
  },
};
