/** Flesh Scribe: the forbidden seals. */
import { SILENCE_TURNS, SEAL_KINDS } from "@/game/domain/characters/scribe/seals";
import { withPlayer } from "../matchView";
import type { StepHandlers } from "./types";

export const sealsSteps: StepHandlers<"sealsWritten" | "sealBroken"> = {
  sealsWritten: (event, timings) => {
    // The scrolls appear on their tiles, beside any written before.
    return [
      {
        apply: (view) => ({
          ...view,
          seals: [
            ...view.seals,
            ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SEAL_KINDS[index] })),
          ],
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  sealBroken: (event, timings) => {
    // The scroll bursts open, showing which seal it was; the Pact's energy changes hands.
    return [
      {
        apply: (view) => {
          const drained = withPlayer(view, event.playerId, (player) => ({
            energy: player.energy - event.energyLost,
            silencedTurns:
              event.kind === "silence" && event.owner !== event.playerId ? SILENCE_TURNS : player.silencedTurns,
          }));
          const paid = withPlayer(drained, event.owner, (player) => ({ energy: player.energy + event.energyGained }));
          return {
            ...paid,
            seals: view.seals.filter((seal) => seal.tile !== event.tile),
            effect: {
              kind: "seal",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              seal: {
                kind: event.kind,
                owner: event.owner,
                energyLost: event.energyLost,
                energyGained: event.energyGained,
              },
            },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
};
