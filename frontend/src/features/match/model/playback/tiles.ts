/** What tiles do to whoever lands on them: realms, blessings, portals and traps. */
import { blessingTurns } from "@/game/domain/board/blessings";
import type { PlaybackTimings } from "../../config";
import { withPlayer, withPlayerAt, type TileEffectView } from "../matchView";
import { blessingTurnsOf } from "./helpers";
import type { EventOf, PlaybackStep, StepHandlers } from "./types";

/** A portal or a trap carries the player off: the tile flares up, then they travel to where it sends them. */
function carriedAwaySteps(event: EventOf<"portalEntered" | "trapTriggered">, timings: PlaybackTimings): PlaybackStep[] {
  const kind = event.type === "portalEntered" ? "portal" : "trap";
  return [
    {
      apply: (view) => ({ ...view, effect: { kind, ...event } }),
      durationMs: timings.effectWarmupMs,
    },
    {
      apply: (view) => withPlayerAt(view, event.playerId, event.to),
      durationMs: timings.effectTravelMs,
    },
  ];
}

export const tilesSteps: StepHandlers<
  | "realmEntered"
  | "blessingReceived"
  | "portalEntered"
  | "trapTriggered"
  | "trapCursed"
  | "trapBlocked"
  | "hiddenTrapSprung"
  | "trapUnpinned"
  | "trapDestroyed"
> = {
  realmEntered: (event, timings) => {
    // The gate opens (tunnel of fire or pillar of light), then the player is carried in.
    return [
      {
        apply: (view) => ({
          ...view,
          effect: {
            kind: "realmEnter",
            playerId: event.playerId,
            from: event.from,
            to: event.to,
            realm: event.realm,
          },
        }),
        durationMs: timings.realmGateMs,
      },
      {
        apply: (view) => withPlayerAt(view, event.playerId, event.to),
        durationMs: timings.effectTravelMs,
      },
    ];
  },
  blessingReceived: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) =>
            event.blessing === "shield"
              ? { shielded: true }
              : event.blessing === "charge"
                ? {
                    abilityCharge: player.abilityCharge + (event.charged ? 1 : 0),
                  }
                : event.blessing === "energy"
                  ? { energy: player.energy + event.energyGained }
                  : {
                      blessings: [
                        ...player.blessings,
                        {
                          kind: event.blessing,
                          turnsLeft: blessingTurns(player),
                          fresh: true,
                        },
                      ],
                    },
          ),
          effect: {
            kind: "blessing",
            playerId: event.playerId,
            from: event.tile,
            to: event.tile,
            blessing: {
              kind: event.blessing,
              energyGained: event.energyGained,
              charged: event.charged,
              turns: blessingTurnsOf(view, event.playerId),
            },
          },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  portalEntered: carriedAwaySteps,
  trapTriggered: carriedAwaySteps,
  trapCursed: (event, timings) => {
    return [
      {
        apply: (view) => {
          const withLoss = withPlayer(view, event.playerId, (player) => ({
            hand: player.hand.filter((card) => card.uid !== event.card?.uid),
            discard: event.card ? [...player.discard, event.card] : player.discard,
            energy: player.energy - event.energyLost,
          }));
          const tile = withLoss.players.find((player) => player.id === event.playerId)?.position ?? 0;
          const curse = { kind: event.curse, card: event.card, energyLost: event.energyLost };
          return {
            ...withLoss,
            effect: { kind: "trapCurse", playerId: event.playerId, from: tile, to: tile, curse },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  trapBlocked: (event, timings) => {
    const effect: TileEffectView = {
      kind: "trapBlocked",
      playerId: event.playerId,
      from: event.tile,
      to: event.tile,
      ward: { kind: event.ward, hidden: event.hidden },
    };
    return [
      {
        apply: (view) => ({
          ...(event.ward === "shield" ? withPlayer(view, event.playerId, () => ({ shielded: false })) : view),
          effect,
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
  hiddenTrapSprung: (event, timings) => {
    // The trap shows itself on the tile, then throws the player back.
    return [
      {
        apply: (view) => ({
          ...view,
          effect: { kind: "hiddenTrap", playerId: event.playerId, from: event.tile, to: event.to },
        }),
        durationMs: timings.hiddenTrapRevealMs,
      },
      {
        apply: (view) => withPlayerAt(view, event.playerId, event.to),
        durationMs: timings.effectTravelMs,
      },
    ];
  },
  trapUnpinned: (event) => {
    return [
      {
        apply: (view) => ({ ...view, pinnedTraps: view.pinnedTraps.filter((tile) => tile !== event.tile) }),
        durationMs: 0,
      },
    ];
  },
  // Silent: the tile turns to rubble as the blades strike.
  trapDestroyed: (event) => {
    return [
      {
        apply: (view) => ({ ...view, destroyedTraps: [...view.destroyedTraps, event.tile] }),
        durationMs: 0,
      },
    ];
  },
};
