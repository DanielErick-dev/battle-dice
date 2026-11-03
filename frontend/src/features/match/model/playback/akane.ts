/** Akane: scarlet fire on the board, people on fire, his Inner Flame and his cards. */
import { BURN_ROUNDS, FIRE_TOLL, SCARLET_ROUNDS } from "@/game/domain/characters/akane/fire";
import { MAX_ENERGY } from "@/game/domain/core/energy";
import { FIRE_BOLT_SECONDS, FIRE_RACE_STEP } from "../../config";
import { nextFxId, withFx, withPlayer, type BlazeView, type MatchView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

function blaze(view: MatchView, blaze: Omit<BlazeView, "id" | "targetIds" | "tiles"> & Partial<BlazeView>): MatchView {
  return withFx(view, { blaze: { targetIds: [], tiles: [], ...blaze, id: nextFxId(view.fx.blaze) } });
}

/** The Fire Zone's fireball flight and the fire racing on tile by tile (see ScarletFlames), plus a beat to take it in. */
function fireRaceMs(tiles: number): number {
  return (FIRE_BOLT_SECONDS + tiles * FIRE_RACE_STEP + 0.4) * 1000;
}

export const akaneSteps: StepHandlers<
  | "scarletLit"
  | "scarletFaded"
  | "playerIgnited"
  | "fireQuenched"
  | "innerFlameKindled"
  | "impetusUnleashed"
  | "emberSlid"
  | "hotBloodBurst"
  | "fuelPoured"
  | "emberStepReady"
  | "supernova"
  | "fireFed"
> = {
  scarletLit: (event, timings) => [
    {
      apply: (view) => ({
        // His Fire Zone: the fireball he just pitched comes down ahead and the fire races on from there.
        ...(event.zone ? blaze(view, { kind: "lob", playerId: event.playerId, tiles: event.tiles }) : view),
        scarletFlames: [
          ...view.scarletFlames.filter((flame) => !event.tiles.includes(flame.tile)),
          ...event.tiles.map((tile) => ({ tile, owner: event.playerId, turnsLeft: SCARLET_ROUNDS + 1 })),
        ],
        // Scarlet fire beats frost: the fairy's snow under it is gone.
        enchantedTiles: view.enchantedTiles.filter((enchanted) => !event.melted.includes(enchanted.tile)),
        effect: { ...playerTileEffect(view, event.playerId, "scarletLit"), count: event.tiles.length },
      }),
      // The camera rides the fire down the path: held until it has reached the last tile.
      durationMs: event.zone ? fireRaceMs(event.tiles.length) : timings.noticeMs,
    },
  ],
  scarletFaded: (event) => [
    {
      apply: (view) => ({
        ...view,
        scarletFlames: view.scarletFlames.filter((flame) => !event.tiles.includes(flame.tile)),
      }),
      durationMs: 0,
    },
  ],
  playerIgnited: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(
          // Set alight by his hand, not his ground: a fireball flies at them.
          event.tile === undefined
            ? blaze(view, { kind: "bolt", playerId: event.by, targetIds: [event.playerId] })
            : view,
          event.playerId,
          (player) => ({ burning: Math.max(player.burning, BURN_ROUNDS) }),
        ),
        effect: { ...playerTileEffect(view, event.playerId, "ignited"), count: event.rounds },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  fireQuenched: (event, timings) => [
    {
      apply: (view) => ({
        ...event.playerIds.reduce((next, id) => withPlayer(next, id, () => ({ burning: 0 })), view),
        effect: { ...playerTileEffect(view, event.playerIds[0], "quenched"), count: event.playerIds.length },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  innerFlameKindled: (event, timings) => [
    {
      apply: (view) => ({
        // A low roll or a trap: he stomps in a fury as the spark kindles.
        ...withPlayer(blaze(view, { kind: "fume", playerId: event.playerId, act: "fume" }), event.playerId, () => ({
          innerFlame: event.flames,
        })),
        effect: { ...playerTileEffect(view, event.playerId, "kindled"), count: event.flames },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  impetusUnleashed: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(blaze(view, { kind: "pillar", playerId: event.playerId, act: "strike" }), event.playerId, () => ({
          innerFlame: 0,
          impetusRolls: event.rolls,
        })),
        effect: { ...playerTileEffect(view, event.playerId, "impetus"), count: event.rolls },
      }),
      durationMs: timings.fireStrikeMs,
    },
  ],
  emberSlid: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(blaze(view, { kind: "burst", playerId: event.playerId }), event.playerId, () => ({
          emberStep: false,
        })),
        effect: { ...playerTileEffect(view, event.playerId, "emberSlid") },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  hotBloodBurst: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(
          blaze(view, { kind: "burst", playerId: event.playerId, targetIds: event.targetIds, act: "strike" }),
          event.playerId,
          () => ({ innerFlame: 0 }),
        ),
        effect: { ...playerTileEffect(view, event.playerId, "hotBlood"), count: event.tiles },
      }),
      durationMs: timings.fireStrikeMs,
    },
  ],
  fuelPoured: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.playerId, () => ({ fuelRolls: event.rolls })),
        effect: { ...playerTileEffect(view, event.playerId, "fuel"), count: event.rolls },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  emberStepReady: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.playerId, () => ({ emberStep: true })),
        effect: playerTileEffect(view, event.playerId, "emberStep"),
      }),
      durationMs: timings.noticeMs,
    },
  ],
  supernova: (event, timings) => [
    {
      apply: (view) => ({
        ...blaze(view, { kind: "nova", playerId: event.playerId, tiles: view.scarletFlames.map(({ tile }) => tile) }),
        effect: { ...playerTileEffect(view, event.playerId, "supernova"), count: event.tiles },
      }),
      durationMs: timings.verdictWeighMs,
    },
  ],
  fireFed: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(
          withPlayer(view, event.playerId, (player) => ({ energy: player.energy - event.energy })),
          event.by,
          (player) => ({ energy: Math.min(MAX_ENERGY, player.energy + FIRE_TOLL) }),
        ),
        effect: { ...playerTileEffect(view, event.playerId, "fireFed"), count: event.energy },
      }),
      durationMs: timings.noticeMs,
    },
  ],
};
