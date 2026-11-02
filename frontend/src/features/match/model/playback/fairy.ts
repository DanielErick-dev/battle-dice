/** Crystal Fairy: snow on the traps and the Eternal Winter. */
import { MAX_ENERGY } from "@/game/domain/core/energy";
import { nextFxId, withFx, withPlayer, type MatchView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const fairySteps: StepHandlers<
  "snowDrained" | "tilesEnchanted" | "tilesFrozen" | "winterBegan" | "winterSpread" | "enchantmentStirred"
> = {
  // The snow drinks from its prisoner, and loosens its grip a round.
  snowDrained: (event, timings) => {
    return [
      {
        apply: (view) => {
          const drained = withPlayer(view, event.playerId, (player) => ({
            energy: player.energy - event.energy,
            snowbound:
              player.snowbound && player.snowbound.rounds > 1
                ? { ...player.snowbound, rounds: player.snowbound.rounds - 1 }
                : null,
          }));
          const fed = withPlayer(drained, event.owner, (owner) => ({
            energy: Math.min(MAX_ENERGY, owner.energy + event.energy),
          }));
          const tile = fed.players.find((player) => player.id === event.playerId)?.position ?? 0;
          return {
            ...fed,
            effect: {
              kind: "snowDrained",
              playerId: event.playerId,
              from: tile,
              to: tile,
              count: event.energy,
              drainedBy: fed.players.find((player) => player.id === event.owner)?.name ?? "",
            },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  tilesEnchanted: (event, timings) => {
    // Snow streams from her wand to each harmful tile ahead in turn (the camera following it),
    // and the tile blooms, enchanted for good, as it lands; then back to her.
    const landed = (view: MatchView, index: number): MatchView =>
      index < 0
        ? view
        : { ...view, enchantedTiles: [...view.enchantedTiles, { tile: event.tiles[index], owner: event.playerId }] };
    return [
      ...event.tiles.map((tile, index) => ({
        apply: (view: MatchView) =>
          withFx(landed(view, index - 1), {
            frostStream: { id: nextFxId(view.fx.frostStream), playerId: event.playerId, tile },
          }),
        durationMs: timings.frostStreamMs,
      })),
      {
        apply: (view: MatchView) => withFx(landed(view, event.tiles.length - 1), { frostStream: null }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  tilesFrozen: (event, timings) => {
    // As with the snow before it: a stream from her wand to each tile she picked, freezing as it lands.
    const landed = (view: MatchView, index: number): MatchView =>
      index < 0 || !view.winter
        ? view
        : {
            ...view,
            winter: { ...view.winter, iced: [...view.winter.iced, event.tiles[index]] },
            blackFlames: view.blackFlames.filter((flame) => flame.tile !== event.tiles[index]),
          };
    return [
      ...event.tiles.map((tile, index) => ({
        apply: (view: MatchView) =>
          withFx(landed(view, index - 1), {
            frostStream: { id: nextFxId(view.fx.frostStream), playerId: event.playerId, tile },
          }),
        durationMs: timings.frostStreamMs,
      })),
      {
        apply: (view: MatchView) => withFx(landed(view, event.tiles.length - 1), { frostStream: null }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  winterBegan: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...view,
          winter: {
            owner: event.playerId,
            frontier: view.winter?.frontier ?? 1,
            iced: view.winter?.iced ?? [],
          },
          effect: playerTileEffect(view, event.playerId, "winter"),
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  winterSpread: (event) => {
    // The ice creeps on along the path.
    return [
      {
        apply: (view) => ({
          ...view,
          winter: {
            owner: event.owner,
            frontier: event.to,
            iced: (view.winter?.iced ?? []).filter((tile) => tile > event.to),
          },
          blackFlames: view.blackFlames.filter((flame) => flame.tile < event.from || flame.tile > event.to),
        }),
        durationMs: 0,
      },
    ];
  },
  enchantmentStirred: (event, timings) => {
    return [
      {
        apply: (view) => {
          const frozen = withPlayer(view, event.playerId, (player) => ({
            skipTurns: player.skipTurns + event.frozen,
            ...(event.frozen > 0 && {
              snowbound: {
                owner: event.owner,
                rounds: Math.max(event.frozen, player.snowbound?.rounds ?? 0),
              },
            }),
          }));
          const paid = withPlayer(frozen, event.owner, (player) => ({
            abilityCharge: player.abilityCharge + (event.charged ? 1 : 0),
          }));
          return {
            ...paid,
            effect: {
              kind: "enchanted",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              enchanted: { owner: event.owner, frozen: event.frozen },
            },
          };
        },
        // On her own snow the fairy hops before it carries her on.
        durationMs: event.playerId === event.owner ? timings.snowHopMs : timings.noticeMs,
      },
    ];
  },
};
