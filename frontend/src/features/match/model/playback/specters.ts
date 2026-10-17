/** Shadow Warden: the spectral apparitions. */
import { SPECTER_KINDS } from "@/game/domain/specters";
import { withPlayer } from "../matchView";
import type { StepHandlers } from "./types";

export const spectersSteps: StepHandlers<
  "spectersSummoned" | "specterStruck" | "spectersDispelled" | "plunderOffered"
> = {
  spectersSummoned: (event, timings) => {
    // The apparitions rise from the floor, beside any summoned before.
    return [
      {
        apply: (view) => ({
          ...view,
          specters: [
            ...view.specters,
            ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SPECTER_KINDS[index] })),
          ],
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  specterStruck: (event, timings) => {
    // The apparition lunges and fades; Hunger's energy changes hands.
    return [
      {
        apply: (view) => {
          const drained = withPlayer(view, event.playerId, (player) => ({
            energy: event.owner === event.playerId ? player.energy : player.energy - event.energyTaken,
          }));
          const fed = withPlayer(drained, event.owner, (player) => ({
            energy: player.energy + event.energyGained,
            abilityCharge: player.abilityCharge + event.chargeGained,
          }));
          return {
            ...fed,
            specters: view.specters.filter((specter) => specter.tile !== event.tile),
            effect: {
              kind: "specter",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              specter: {
                kind: event.kind,
                owner: event.owner,
                energyTaken: event.energyTaken,
                energyGained: event.energyGained,
                chargeGained: event.chargeGained,
              },
            },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  spectersDispelled: (event, timings) => {
    return [
      {
        apply: (view) => {
          const tile = view.players.find((player) => player.id === event.owner)?.position ?? 0;
          return {
            ...view,
            specters: view.specters.filter((specter) => specter.owner !== event.owner),
            effect: {
              kind: "specter",
              playerId: event.playerId,
              from: tile,
              to: tile,
              specter: { kind: null, owner: event.owner, energyTaken: 0, energyGained: 0, chargeGained: 0 },
            },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  plunderOffered: () => {
    // The Warden's pick comes with the final sync (pendingPlunder); nothing to show meanwhile.
    return [];
  },
};
