/** Tenzai: his bendings, walls, bonds, the Combustion Die, the Breeze Heist and the Convergence. */
import { nextFxId, withFx, withPlayer, withPlayerAt, type MatchView } from "../matchView";
import type { BendingView } from "../matchView/fx";
import { carried, playerTileEffect, tileOf } from "./helpers";
import type { StepHandlers } from "./types";

function bending(view: MatchView, fx: Omit<BendingView, "id">): MatchView {
  return withFx(view, { bending: { ...fx, id: nextFxId(view.fx.bending) } });
}

/** How long each bending holds the camera on him: his whole gesture (quake/tide/flare/gust, sped up) and a beat after. */
const BENDING_MS = { earth: 2700, water: 3300, fire: 2600, wind: 3400 } as const;
/** A run of punches on the wall, the hp coming off with them. */
const WALL_PUNCH_MS = 2200;

export const tenzaiSteps: StepHandlers<
  | "elementBent"
  | "elementAttuned"
  | "convergenceAwakened"
  | "wallRaised"
  | "wallStrengthened"
  | "wallHit"
  | "wallCrumbled"
  | "tetherBound"
  | "tetherPulled"
  | "tetherSnapped"
  | "tetherSwapped"
  | "combustionReady"
  | "combustionExploded"
  | "breezeArmed"
  | "breezeStolen"
  | "breezeResisted"
  | "breezeFaded"
> = {
  elementBent: (event, timings) => [
    {
      apply: (view) => ({
        ...bending(view, { playerId: event.playerId, kind: event.element }),
        effect: { ...playerTileEffect(view, event.playerId, "elementBent"), element: event.element },
      }),
      durationMs: Math.max(timings.noticeMs, BENDING_MS[event.element]),
    },
  ],
  elementAttuned: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.playerId, (player) => ({ tenzai: { ...player.tenzai, orbit: event.elements } })),
        effect: {
          ...playerTileEffect(view, event.playerId, "attuned"),
          element: event.element,
          count: event.elements.length,
        },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  convergenceAwakened: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(bending(view, { playerId: event.playerId, kind: "convergence" }), event.playerId, (player) => ({
          tenzai: { ...player.tenzai, orbit: [], converged: event.turns },
        })),
        effect: { ...playerTileEffect(view, event.playerId, "convergence"), count: event.turns },
      }),
      durationMs: timings.fireStrikeMs,
    },
  ],
  wallRaised: (event, timings) => [
    {
      apply: (view) => ({
        ...bending(view, { playerId: event.playerId, kind: "earth", tile: event.tile }),
        elementals: {
          ...view.elementals,
          walls: [
            ...view.elementals.walls.filter((wall) => wall.tile !== event.tile),
            { tile: event.tile, owner: event.playerId, hp: event.hp, maxHp: event.hp },
          ],
        },
        effect: { kind: "wallRaised", playerId: event.playerId, from: event.tile, to: event.tile, count: event.hp },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  wallStrengthened: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        elementals: {
          ...view.elementals,
          walls: view.elementals.walls.map((wall) =>
            wall.tile === event.tile ? { ...wall, hp: event.hp, maxHp: Math.max(wall.maxHp, event.hp) } : wall,
          ),
        },
        effect: {
          kind: "wallStrengthened",
          playerId: event.playerId,
          from: event.tile,
          to: event.tile,
          count: event.hp,
        },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  wallHit: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        elementals: {
          ...view.elementals,
          walls: view.elementals.walls.map((wall) => (wall.tile === event.tile ? { ...wall, hp: event.hp } : wall)),
        },
        effect: { ...tileOf(event), kind: "wallHit", count: event.hp },
      }),
      durationMs: Math.max(timings.noticeMs, WALL_PUNCH_MS),
    },
  ],
  wallCrumbled: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        elementals: { ...view.elementals, walls: view.elementals.walls.filter((wall) => wall.tile !== event.tile) },
        effect: { kind: "wallCrumbled", playerId: event.owner, from: event.tile, to: event.tile },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  tetherBound: (event, timings) => [
    {
      apply: (view) => ({
        ...bending(view, { playerId: event.playerId, kind: "water", targetId: event.targetId }),
        elementals: {
          ...view.elementals,
          tethers: [
            ...view.elementals.tethers.filter((tether) => tether.owner !== event.playerId),
            { owner: event.playerId, target: event.targetId, turnsLeft: event.turns + 1, share: 0.5 },
          ],
        },
        effect: { ...playerTileEffect(view, event.targetId, "tetherBound"), count: event.turns },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  tetherPulled: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "tetherPulled"), count: event.path.length },
      }),
      durationMs: timings.effectWarmupMs,
    },
    ...carried(event.playerId, event.path, timings),
  ],
  tetherSnapped: (event) => [
    {
      apply: (view) => ({
        ...view,
        elementals: {
          ...view.elementals,
          tethers: view.elementals.tethers.filter((tether) => tether.owner !== event.playerId),
        },
      }),
      durationMs: 0,
    },
  ],
  tetherSwapped: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayerAt(withPlayerAt(view, event.playerId, event.to), event.targetId, event.from),
        effect: { kind: "tetherSwapped", playerId: event.playerId, from: event.from, to: event.to },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  combustionReady: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.playerId, (player) => ({
          tenzai: { ...player.tenzai, combustion: { multiplier: event.multiplier, push: 0 } },
        })),
        effect: { ...playerTileEffect(view, event.playerId, "combustionReady"), count: event.multiplier },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  combustionExploded: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(
          bending(view, { playerId: event.playerId, kind: "explosion", tile: event.tile }),
          event.playerId,
          (player) => ({
            tenzai: { ...player.tenzai, combustion: null },
          }),
        ),
        effect: {
          kind: "combustion",
          playerId: event.playerId,
          from: event.tile,
          to: event.tile,
          count: event.pushed.length,
        },
      }),
      durationMs: timings.fireStrikeMs,
    },
  ],
  breezeArmed: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        elementals: {
          ...view.elementals,
          breezes: [
            ...view.elementals.breezes.filter((breeze) => breeze.owner !== event.playerId),
            { owner: event.playerId, doubled: event.doubled },
          ],
        },
        effect: playerTileEffect(view, event.playerId, "breezeArmed"),
      }),
      durationMs: timings.noticeMs,
    },
  ],
  breezeStolen: (event, timings) => [
    {
      apply: (view) => ({
        ...bending(view, { playerId: event.playerId, kind: "heist", targetId: event.victimId }),
        elementals: {
          ...view.elementals,
          breezes: view.elementals.breezes.filter((breeze) => breeze.owner !== event.playerId),
        },
        effect: { ...playerTileEffect(view, event.victimId, "breezeStolen"), count: event.value },
        // Straight over to Tenzai: it's his move, not the roller's.
        movingPlayerId: event.playerId,
      }),
      durationMs: timings.fireStrikeMs,
    },
    ...carried(event.playerId, event.path, timings),
  ],
  breezeResisted: (event, timings) => [
    {
      apply: (view) => ({ ...view, effect: playerTileEffect(view, event.victimId, "breezeResisted") }),
      durationMs: timings.noticeMs,
    },
  ],
  breezeFaded: (event) => [
    {
      apply: (view) => ({
        ...view,
        elementals: {
          ...view.elementals,
          breezes: view.elementals.breezes.filter((breeze) => breeze.owner !== event.playerId),
        },
      }),
      durationMs: 0,
    },
  ],
};
