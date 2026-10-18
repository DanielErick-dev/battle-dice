/** Elven Archer: Arrow Rain's volley. */
import { nextFxId, withFx } from "../matchView";
import type { StepHandlers } from "./types";

export const arrowRainSteps: StepHandlers<"arrowsLoosed"> = {
  arrowsLoosed: (event, timings) => {
    // Up into the sky, down on the targets; pinned tiles keep their arrows once they hit.
    return [
      {
        apply: (view) =>
          withFx(view, {
            volley: {
              id: nextFxId(view.fx.volley),
              playerId: event.playerId,
              from: view.players.find((player) => player.id === event.playerId)?.position ?? 0,
              targets: event.targets,
            },
          }),
        durationMs: timings.arrowVolleyMs,
      },
      {
        apply: (view) => ({ ...view, pinnedTraps: [...view.pinnedTraps, ...event.pinned] }),
        durationMs: timings.arrowImpactMs,
      },
    ];
  },
};
