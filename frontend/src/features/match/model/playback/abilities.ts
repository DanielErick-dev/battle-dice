/** Ability charge and use, wards and armour, and the abilities small enough to share a file. */
import { abilityCycle, isReactive, LEVITATION_TURNS } from "@/game/domain/abilities";
import type { PlaybackTimings } from "../../config";
import { nextFxId, withFx, withPlayer } from "../matchView";
import { abilityUsedMs, abilityEffect, playerTileEffect } from "./helpers";
import type { EventOf, PlaybackStep, StepHandlers } from "./types";

/** Shared by abilities and cards an opponent turned away. */
function blockedSteps(event: EventOf<"abilityBlocked" | "cardBlocked">, timings: PlaybackTimings): PlaybackStep[] {
  // Shown over whoever threw it: the opponent turned it away, and it's spent.
  return [
    {
      apply: (view) => ({
        ...view,
        effect: {
          ...playerTileEffect(view, event.playerId, "abilityBlocked"),
          blocked: {
            ...(event.type === "abilityBlocked" ? { ability: event.ability } : { cardId: event.cardId }),
            ward: event.ward,
            targetName: view.players.find((player) => player.id === event.targetId)?.name ?? "",
          },
        },
      }),
      durationMs: timings.noticeMs,
    },
  ];
}

export const abilitiesSteps: StepHandlers<
  | "abilityReady"
  | "abilityUsed"
  | "abilityBlocked"
  | "cardBlocked"
  | "wardOffered"
  | "armourRaised"
  | "armourHeld"
  | "timeBent"
  | "boardCleansed"
  | "levitatedOver"
> = {
  abilityReady: (event, timings) => {
    return [
      {
        apply: (view) => {
          const charged = withPlayer(view, event.playerId, () => ({ abilityCharge: abilityCycle(event.ability) }));
          // The Silent Verdict arms in secret: no banner for the table to read.
          if (event.ability === "silentVerdict") return charged;
          return { ...charged, effect: abilityEffect(charged, event.playerId, "abilityReady", event.ability) };
        },
        durationMs: event.ability === "silentVerdict" ? 0 : timings.noticeMs,
      },
    ];
  },
  abilityUsed: (event, timings) => {
    return [
      {
        apply: (view) => {
          const spent = withPlayer(view, event.playerId, (player) => ({
            abilityCharge: 0,
            levitating: event.ability === "levitation" ? LEVITATION_TURNS : player.levitating,
          }));
          return {
            ...spent,
            // A reactive ability does its work at once; the others last for the turn.
            abilityInUse: isReactive(event.ability) ? view.abilityInUse : event.ability,
            effect: abilityEffect(spent, event.playerId, "abilityUsed", event.ability),
          };
        },
        durationMs: abilityUsedMs(event.ability, timings),
      },
    ];
  },
  boardCleansed: (event, timings) => {
    // The wave rolls over the tiles ahead, then what it washed away is gone.
    return [
      {
        apply: (view) =>
          withFx(view, {
            tide: { id: nextFxId(view.fx.tide), playerId: event.playerId, path: event.reach, rolling: true },
          }),
        durationMs: timings.tideMs,
      },
      {
        apply: (view) => ({
          ...withFx(view, { tide: view.fx.tide && { ...view.fx.tide, rolling: false } }),
          blackFlames: view.blackFlames.filter((flame) => !event.tiles.includes(flame.tile)),
          enchantedTiles: view.enchantedTiles.filter((enchanted) => !event.tiles.includes(enchanted.tile)),
          specters: view.specters.filter((specter) => !event.tiles.includes(specter.tile)),
          seals: view.seals.filter((seal) => !event.tiles.includes(seal.tile)),
          pinnedTraps: view.pinnedTraps.filter((tile) => !event.tiles.includes(tile)),
          effect: {
            ...playerTileEffect(view, event.playerId, "cleansed"),
            count: event.tiles.length,
          },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  timeBent: (event, timings) => {
    // Shown over the opponent whose time was bent.
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.targetId, (player) =>
            event.power === "halt"
              ? { skipTurns: player.skipTurns + event.rounds }
              : { reversedRolls: player.reversedRolls + event.rounds },
          ),
          effect: { ...playerTileEffect(view, event.targetId, "timeBent"), time: event.power, count: event.rounds },
        }),
        durationMs: timings.timeBentMs,
      },
      // Then the camera goes back to Cronos.
      { apply: (view) => ({ ...view, effect: null }), durationMs: 0 },
    ];
  },
  abilityBlocked: blockedSteps,
  cardBlocked: blockedSteps,
  armourRaised: (event, timings) => {
    return [
      {
        apply: (view) => withPlayer(view, event.playerId, () => ({ spectralArmour: event.turns })),
        durationMs: timings.noticeMs,
      },
    ];
  },
  armourHeld: (event, timings) => {
    // Untamed, it's not armour that turned it away: the Berserker just shrugs it off.
    return [
      {
        apply: (view) => ({
          ...view,
          effect: view.players.some((player) => player.id === event.playerId && player.untamed > 0)
            ? {
                kind: "trapBlocked",
                playerId: event.playerId,
                from: event.tile,
                to: event.tile,
                ward: { kind: "untamed", hidden: false },
              }
            : {
                kind: "armour",
                playerId: event.playerId,
                from: event.tile,
                to: event.tile,
              },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  levitatedOver: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...view,
          effect: { kind: "levitated", playerId: event.playerId, from: event.tile, to: event.tile },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  wardOffered: (event) => {
    return [
      {
        apply: (view) => ({
          ...view,
          pendingWard: { playerId: event.playerId, tile: event.tile, threat: event.threat },
        }),
        durationMs: 0,
      },
    ];
  },
};
