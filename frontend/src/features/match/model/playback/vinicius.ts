/** Vinicius: the traps he hoes out. */
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const viniciusSteps: StepHandlers<"trapWeeded"> = {
  trapWeeded: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        destroyedTraps: [...view.destroyedTraps, event.tile],
        effect: playerTileEffect(view, event.playerId, "weeded"),
      }),
      durationMs: timings.noticeMs,
    },
  ],
};
