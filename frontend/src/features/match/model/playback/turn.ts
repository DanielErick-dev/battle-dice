/** Dice, walking, pushes and the flow of turns. */
import { DICE_SIDES } from "@/game/domain/core/dice";
import { nextFxId, withFx, withPlayer, withPlayerAt, type MatchView } from "../matchView";
import { playerTileEffect, tileOf } from "./helpers";
import type { StepHandlers } from "./types";

export const turnSteps: StepHandlers<
  | "diceRolled"
  | "playerMoved"
  | "playerPushed"
  | "advanceTriggered"
  | "extraTurnGranted"
  | "skipTurnGained"
  | "turnSkipped"
  | "turnChanged"
  | "turnTimedOut"
  | "playerWon"
  | "gameRestarted"
> = {
  diceRolled: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...view,
          isRolling: true,
          lastRoll: null,
          roll: { id: (view.roll?.id ?? 0) + 1, dice: event.dice },
          poweredPlayerId: event.dice.includes(DICE_SIDES) ? event.playerId : null,
          effect: null,
          movingPlayerId: event.playerId,
        }),
        durationMs: timings.diceRollMs,
      },
      {
        apply: (view) => ({
          ...view,
          isRolling: false,
          lastRoll: {
            dice: event.dice,
            best: event.best ?? false,
            bonus: event.bonus ?? 0,
            multiplier: event.multiplier ?? 1,
            halved: event.halved ?? false,
            total: event.value,
          },
        }),
        durationMs: timings.diceRevealMs,
      },
      // On fire, the roll is halved: said out loud, or a 1 that goes nowhere looks like a bug.
      ...(event.halved
        ? [
            {
              apply: (view: MatchView) => ({
                ...view,
                effect: { ...playerTileEffect(view, event.playerId, "burntRoll"), count: event.value },
              }),
              durationMs: timings.noticeMs,
            },
          ]
        : []),
    ];
  },
  playerMoved: (event, timings) => {
    // The Berserker runs on from where he shoved someone.
    const end = event.path.at(-1);
    const steps = event.path.map((tile) => ({
      apply: (view: MatchView) => ({
        ...withFx(withPlayerAt(view, event.playerId, tile), {
          trample: view.fx.trample?.by === event.playerId ? null : view.fx.trample,
        }),
        walkEnd: event.dash || end === undefined ? null : { playerId: event.playerId, tile: end },
        // Blind Justice walks everyone in turn: the camera goes with whoever is walking.
        movingPlayerId: view.fx.march ? event.playerId : view.movingPlayerId,
      }),
      durationMs: event.dash ? timings.dashStepMs : timings.stepMs,
    }));
    if (!event.dash) return steps;
    // Dormant Fury: launch and strike, a blur of tiles, then the lightning lets go.
    return [
      {
        apply: (view) => {
          const from = view.players.find((player) => player.id === event.playerId)?.position;
          const path = from === undefined ? event.path : [from, ...event.path];
          return withFx(view, { dash: { id: nextFxId(view.fx.dash), playerId: event.playerId, path, arrived: false } });
        },
        durationMs: timings.dashLaunchMs + timings.dashStrikeMs,
      },
      ...steps,
      {
        apply: (view) => (view.fx.dash ? withFx(view, { dash: { ...view.fx.dash, arrived: true } }) : view),
        durationMs: timings.dashArriveMs,
      },
    ];
  },
  advanceTriggered: (event, timings) => {
    // The walk itself comes as the next playerMoved event.
    return [
      {
        apply: (view) => ({ ...view, effect: { kind: "advance", ...event }, poweredPlayerId: event.playerId }),
        durationMs: timings.effectWarmupMs,
      },
    ];
  },
  extraTurnGranted: (event, timings) => {
    return [
      {
        apply: (view) => ({ ...view, effect: { kind: "extraTurn", ...tileOf(event) } }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  skipTurnGained: (event, timings) => {
    // Counted at once, so the player sits down to wait while still in view.
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({ skipTurns: player.skipTurns + (event.turns ?? 1) })),
          effect: { kind: "skipTurn", ...tileOf(event), ...(event.by && { aimed: true }) },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  turnSkipped: (event, timings) => {
    return [
      {
        apply: (view) => {
          const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
          return {
            ...view,
            effect: {
              kind: "turnSkipped",
              playerId: event.playerId,
              from: tile,
              to: tile,
            },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  playerPushed: (event, timings) => {
    return event.path.map((tile) => ({
      apply: (view) => withPlayerAt(view, event.playerId, tile),
      durationMs: timings.pushStepMs,
    }));
  },
  playerWon: (event) => {
    return [{ apply: (view) => ({ ...view, winnerId: event.playerId }), durationMs: 0 }];
  },
  turnTimedOut: (event, timings) => [
    {
      apply: (view) => ({ ...view, effect: playerTileEffect(view, event.playerId, "timedOut") }),
      durationMs: timings.noticeMs,
    },
  ],
  turnChanged: (event, timings) => {
    // A beat on where the turn left things (a knock-back's last tile) before the camera moves on.
    return [
      { apply: (view) => view, durationMs: timings.turnHandoffMs },
      { apply: (view) => ({ ...view, activePlayerId: event.playerId, turnCount: view.turnCount + 1 }), durationMs: 0 },
    ];
  },
  gameRestarted: () => {
    return [
      {
        apply: (view) => ({
          // The dash, trample and fusion are left to finish on their own.
          ...withFx(view, {
            cast: null,
            drawing: null,
            transmuting: null,
            frostStream: null,
            volley: null,
            tide: null,
            drag: null,
          }),
          lastRoll: null,
          effect: null,
          winnerId: null,
          lastDrawnUid: null,
          pendingDiscard: null,
          destroyedTraps: [],
          pinnedTraps: [],
          seals: [],
          specters: [],
          enchantedTiles: [],
          blackFlames: [],
          scarletFlames: [],
          winter: null,
        }),
        durationMs: 0,
      },
    ];
  },
};
