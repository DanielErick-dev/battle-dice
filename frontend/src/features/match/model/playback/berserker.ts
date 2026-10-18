/** Bjorn: Untamed and his trample. */
import { nextFxId, withFx, withPlayer, withPlayerAt, type MatchView } from "../matchView";
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
    const trample = {
      by: event.by,
      victim: event.playerId,
      tile: event.tile,
    };
    // Caught sitting out a lost turn, they get up off their chair first.
    const getUp = {
      apply: (view: MatchView) =>
        withFx(view, { trample: { id: nextFxId(view.fx.trample), ...trample, phase: "rise" } }),
      durationMs: timings.trampleRiseMs,
    };
    return [
      ...(event.seated ? [getUp] : []),
      {
        apply: (view) => {
          const current = view.fx.trample;
          // The same trample goes on after the rise.
          const id = current?.phase === "rise" ? current.id : nextFxId(current);
          return withFx(view, { trample: { id, ...trample, phase: "shove" } });
        },
        durationMs: timings.trampleShoveMs,
      },
      {
        apply: (view) => ({
          ...withFx(withPlayerAt(view, event.playerId, event.path.at(-1) ?? event.tile), {
            trample: view.fx.trample && { ...view.fx.trample, phase: "flying" },
          }),
          effect: {
            ...playerTileEffect(view, event.playerId, "trampled"),
            count: event.path.length,
          },
        }),
        durationMs: timings.trampleFlightMs,
      },
      {
        apply: (view) => withFx(view, { trample: view.fx.trample && { ...view.fx.trample, phase: "over" } }),
        durationMs: timings.trampleRecoverMs,
      },
    ];
  },
};
