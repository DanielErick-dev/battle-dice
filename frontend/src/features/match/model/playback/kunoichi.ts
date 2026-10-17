/** Kage Rubra: black fire and the Susanoo. */
import { FLAME_TURNS } from "@/game/domain/abilities";
import { withPlayer, withPlayerAt } from "../matchView";
import type { StepHandlers } from "./types";

export const kunoichiSteps: StepHandlers<"susanooRepelled" | "flamesLit" | "flamesScorched" | "flamesFaded"> = {
  susanooRepelled: (event, timings) => {
    // They reach her tile and the Susanoo throws them back; they get up there.
    return [
      {
        apply: (view) => ({
          ...withPlayerAt(view, event.playerId, event.to),
          trample: {
            id: (view.trample?.id ?? 0) + 1,
            by: event.by,
            victim: event.playerId,
            tile: event.tile,
            phase: "flying",
            susanoo: true,
          },
          effect: { kind: "repelled", playerId: event.playerId, from: event.tile, to: event.to },
        }),
        durationMs: timings.trampleFlightMs,
      },
      {
        apply: (view) => ({ ...view, trample: view.trample && { ...view.trample, phase: "over" } }),
        durationMs: timings.trampleRecoverMs,
      },
    ];
  },
  flamesLit: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...view,
          blackFlames: [
            ...view.blackFlames,
            ...event.tiles.map((tile) => ({ tile, owner: event.playerId, turnsLeft: FLAME_TURNS, hits: 0 })),
          ],
          // The fairy's snow under the fire melts.
          enchantedTiles: view.enchantedTiles.filter((enchanted) => !event.tiles.includes(enchanted.tile)),
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  flamesScorched: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...withPlayer(
            withPlayer(view, event.playerId, (player) => ({ energy: player.energy - event.energyLost })),
            event.owner,
            (player) => ({ abilityCharge: player.abilityCharge + (event.charged ? 1 : 0) }),
          ),
          effect: {
            kind: "flames",
            playerId: event.playerId,
            from: event.tile,
            to: event.tile,
            flames: { energyLost: event.energyLost },
          },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  flamesFaded: (event) => {
    return [
      {
        apply: (view) => ({
          ...view,
          blackFlames: view.blackFlames.filter(
            (flame) => flame.owner !== event.owner || !event.tiles.includes(flame.tile),
          ),
        }),
        durationMs: 0,
      },
    ];
  },
};
