/** Crystal Fairy: snow on the traps and the Eternal Winter. */
import { MAX_ENERGY } from "@/game/domain/cards";
import { withPlayer, type MatchView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const fairySteps: StepHandlers<
  "snowDrained" | "tilesEnchanted" | "winterBegan" | "winterSpread" | "enchantmentStirred"
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
          return withPlayer(drained, event.owner, (owner) => ({
            energy: Math.min(MAX_ENERGY, owner.energy + event.energy),
          }));
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
        apply: (view: MatchView) => ({
          ...landed(view, index - 1),
          frostStream: { id: (view.frostStream?.id ?? 0) + 1, playerId: event.playerId, tile },
        }),
        durationMs: timings.frostStreamMs,
      })),
      {
        apply: (view: MatchView) => ({ ...landed(view, event.tiles.length - 1), frostStream: null }),
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
          winter: { owner: event.owner, frontier: event.to },
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
