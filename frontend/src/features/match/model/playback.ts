import { abilityCycle, isReactive, LEVITATION_TURNS, SILENCE_TURNS, type AbilityId } from "@/game/domain/abilities";
import { cardCost } from "@/game/domain/cards";
import { throwOnPile } from "@/game/domain/deck";
import { SEAL_KINDS } from "@/game/domain/seals";
import { SPECTER_KINDS } from "@/game/domain/specters";
import { DICE_SIDES } from "@/game/domain/dice";
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState, PlayerId } from "@/game/domain/types";
import type { PlaybackTimings } from "../config";
import { sealViews, specterViews, withPlayer, withPlayerAt, type MatchView, type TileEffectView } from "./matchView";

export interface PlaybackStep {
  apply: (view: MatchView) => MatchView;
  durationMs: number;
}

export function eventToSteps(event: GameEvent, timings: PlaybackTimings): PlaybackStep[] {
  switch (event.type) {
    case "diceRolled":
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
              total: event.value,
            },
          }),
          durationMs: timings.diceRevealMs,
        },
      ];

    case "playerMoved": {
      const steps = event.path.map((tile) => ({
        apply: (view: MatchView) => withPlayerAt(view, event.playerId, tile),
        durationMs: event.dash ? timings.dashStepMs : timings.stepMs,
      }));
      if (!event.dash) return steps;
      // Dormant Fury: the player throws themselves forward, lightning takes them, they cross the path as a
      // blur, then it lets go.
      return [
        {
          apply: (view) => {
            const from = view.players.find((player) => player.id === event.playerId)?.position;
            const path = from === undefined ? event.path : [from, ...event.path];
            return {
              ...view,
              dash: { id: (view.dash?.id ?? 0) + 1, playerId: event.playerId, path, arrived: false },
            };
          },
          durationMs: timings.dashLaunchMs + timings.dashStrikeMs,
        },
        ...steps,
        {
          apply: (view) => (view.dash ? { ...view, dash: { ...view.dash, arrived: true } } : view),
          durationMs: timings.dashArriveMs,
        },
      ];
    }

    case "realmEntered":
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

    case "blessingReceived":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) =>
              event.blessing === "shield" ? { shielded: true } : { energy: player.energy + event.energyGained },
            ),
            effect: {
              kind: "blessing",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              blessing: { kind: event.blessing, energyGained: event.energyGained },
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "portalEntered":
    case "trapTriggered": {
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

    case "advanceTriggered":
      // The walk itself comes as the next playerMoved event.
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "advance", ...event }, poweredPlayerId: event.playerId }),
          durationMs: timings.effectWarmupMs,
        },
      ];

    case "extraTurnGranted":
    case "skipTurnGained": {
      const kind = event.type === "extraTurnGranted" ? "extraTurn" : "skipTurn";
      const effect = { kind, playerId: event.playerId, from: event.tile, to: event.tile } as const;
      return [{ apply: (view) => ({ ...view, effect }), durationMs: timings.noticeMs }];
    }

    case "turnSkipped":
      return [
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
            return { ...view, effect: { kind: "turnSkipped", playerId: event.playerId, from: tile, to: tile } };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardTeleported":
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "teleport", ...event } }),
          durationMs: timings.effectWarmupMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];

    case "trapCursed":
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

    case "trapBlocked": {
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
    }

    case "hiddenTrapSprung":
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

    case "abilityReady":
      return [
        {
          apply: (view) => {
            const charged = withPlayer(view, event.playerId, () => ({ abilityCharge: abilityCycle(event.ability) }));
            return { ...charged, effect: abilityEffect(charged, event.playerId, "abilityReady", event.ability, 0) };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "abilityUsed":
      return [
        {
          apply: (view) => {
            const spent = withPlayer(view, event.playerId, (player) => ({
              abilityCharge: 0,
              energy: player.energy + event.energyGained,
              levitating: event.ability === "levitation" ? LEVITATION_TURNS : player.levitating,
            }));
            return {
              ...spent,
              // A reactive ability does its work at once; the others last for the turn.
              abilityInUse: isReactive(event.ability) ? view.abilityInUse : event.ability,
              effect: abilityEffect(spent, event.playerId, "abilityUsed", event.ability, event.energyGained),
            };
          },
          durationMs: abilityUsedMs(event.ability, timings),
        },
      ];

    case "arrowsLoosed":
      // Up into the sky, down on the targets; pinned tiles keep their arrows once they hit.
      return [
        {
          apply: (view) => ({
            ...view,
            volley: {
              id: (view.volley?.id ?? 0) + 1,
              playerId: event.playerId,
              from: view.players.find((player) => player.id === event.playerId)?.position ?? 0,
              targets: event.targets,
            },
          }),
          durationMs: timings.arrowVolleyMs,
        },
        {
          apply: (view) => ({ ...view, pinnedTraps: [...view.pinnedTraps, ...event.pinned] }),
          durationMs: timings.arrowImpactMs,
        },
      ];

    case "gambleRolled":
      // The die of fortune is thrown like a move's, then the verdict shows over the player.
      return [
        {
          apply: (view) => ({
            ...view,
            isRolling: true,
            roll: { id: (view.roll?.id ?? 0) + 1, dice: [event.value] },
            effect: null,
          }),
          durationMs: timings.diceRollMs,
        },
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
            const gamble = { value: event.value, won: event.won };
            return {
              ...view,
              isRolling: false,
              effect: { kind: "gamble", playerId: event.playerId, from: tile, to: tile, gamble },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardsStolen":
      // Each card is shown as it's taken, then lands in the taker's hand (or discard pile, when full).
      return event.cards.flatMap((card) => {
        const kept = !event.discarded.some((discarded) => discarded.uid === card.uid);
        return [
          {
            apply: (view: MatchView) => ({
              ...withPlayer(view, event.from, (player) => ({
                hand: player.hand.filter((held) => held.uid !== card.uid),
              })),
              drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card },
            }),
            durationMs: timings.drawRevealMs,
          },
          {
            apply: (view: MatchView) => ({
              ...withPlayer(view, event.playerId, (player) =>
                kept ? { hand: [...player.hand, card] } : { discard: throwOnPile(player.discard, [card]) },
              ),
              drawing: null,
              lastDrawnUid: kept ? card.uid : view.lastDrawnUid,
            }),
            durationMs: timings.drawMs,
          },
        ];
      });

    case "spectersSummoned":
      // The apparitions rise from the floor, the Warden's old ones gone.
      return [
        {
          apply: (view) => ({
            ...view,
            specters: [
              ...view.specters.filter((specter) => specter.owner !== event.playerId),
              ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SPECTER_KINDS[index] })),
            ],
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "specterStruck":
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

    case "spectersDispelled":
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

    case "plunderOffered":
      // The Warden's pick comes with the final sync (pendingPlunder); nothing to show meanwhile.
      return [];

    case "sealsWritten":
      // The scrolls appear on their tiles, the writer's old ones gone.
      return [
        {
          apply: (view) => ({
            ...view,
            seals: [
              ...view.seals.filter((seal) => seal.owner !== event.playerId),
              ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SEAL_KINDS[index] })),
            ],
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "sealBroken":
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

    case "cardsResurrected":
      // Each card rises from the discard pile: shown in the middle of the screen, then into the hand.
      return event.cards.flatMap((card) => [
        {
          apply: (view: MatchView) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              discard: player.discard.filter((discarded) => discarded.uid !== card.uid),
            })),
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view: MatchView) => ({
            ...withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, card] })),
            drawing: null,
            lastDrawnUid: card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ]);

    case "trapUnpinned":
      return [
        {
          apply: (view) => ({ ...view, pinnedTraps: view.pinnedTraps.filter((tile) => tile !== event.tile) }),
          durationMs: 0,
        },
      ];

    case "levitatedOver":
      return [
        {
          apply: (view) => ({
            ...view,
            effect: { kind: "levitated", playerId: event.playerId, from: event.tile, to: event.tile },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "wardOffered":
      return [
        {
          apply: (view) => ({
            ...view,
            pendingWard: { playerId: event.playerId, tile: event.tile, threat: event.threat },
          }),
          durationMs: 0,
        },
      ];

    case "playerPushed":
      return event.path.map((tile) => ({
        apply: (view) => withPlayerAt(view, event.playerId, tile),
        durationMs: timings.pushStepMs,
      }));

    case "cardDrawn":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              deck: player.deck.filter((card) => card.uid !== event.card.uid),
            })),
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card: event.card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, event.card] })),
            drawing: null,
            lastDrawnUid: event.card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "cardTransmuted":
      // The old card shows, dissolves in alchemical fire into the new one, which then flies to the hand.
      return [
        {
          apply: (view) => ({
            ...view,
            transmuting: {
              id: (view.transmuting?.id ?? 0) + 1,
              playerId: event.playerId,
              from: event.from,
              to: event.to,
            },
          }),
          durationMs: timings.transmuteMs,
        },
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.map((card) => (card.uid === event.from.uid ? event.to : card)),
            })),
            transmuting: null,
            lastDrawnUid: event.to.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "deckReshuffled":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ deck: player.discard, discard: [] })),
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "discardRequired":
      return [
        {
          apply: (view) => ({
            ...view,
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card: event.card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view) => ({
            ...view,
            drawing: null,
            pendingDiscard: { playerId: event.playerId, drawn: event.card },
          }),
          durationMs: 0,
        },
      ];

    case "cardDiscarded":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: event.hand,
              discard: throwOnPile(player.discard, [event.card]),
            })),
            pendingDiscard: null,
          }),
          durationMs: timings.drawMs / 2,
        },
      ];

    case "cardPlayed":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => card.uid !== event.card.uid),
              discard: throwOnPile(player.discard, [event.card]),
              energy: player.energy - cardCost(event.card.cardId),
            })),
            cast: { id: (view.cast?.id ?? 0) + 1, ...event },
            cardsPlayedThisTurn: view.cardsPlayedThisTurn + 1,
            effect: null,
          }),
          durationMs: timings.castMs,
        },
      ];

    case "playerWon":
      return [{ apply: (view) => ({ ...view, winnerId: event.playerId }), durationMs: 0 }];

    case "turnChanged":
      return [{ apply: (view) => ({ ...view, activePlayerId: event.playerId }), durationMs: 0 }];

    // Silent: the tile turns to rubble as the blades strike.
    case "trapDestroyed":
      return [
        {
          apply: (view) => ({ ...view, destroyedTraps: [...view.destroyedTraps, event.tile] }),
          durationMs: 0,
        },
      ];

    case "gameRestarted":
      return [
        {
          apply: (view) => ({
            ...view,
            lastRoll: null,
            effect: null,
            winnerId: null,
            cast: null,
            drawing: null,
            transmuting: null,
            lastDrawnUid: null,
            pendingDiscard: null,
            destroyedTraps: [],
            pinnedTraps: [],
            seals: [],
            specters: [],
            volley: null,
          }),
          durationMs: 0,
        },
      ];
  }
}

/** Final step of every update: snaps the view onto the authoritative state. */
export function syncStep(state: GameState): PlaybackStep {
  return {
    apply: (view) => ({
      ...view,
      players: state.players,
      activePlayerId: currentPlayer(state).id,
      winnerId: state.winnerId,
      movingPlayerId: null,
      poweredPlayerId: null,
      pendingDiscard: state.pendingDiscard,
      cardsPlayedThisTurn: state.cardsPlayedThisTurn,
      abilityInUse: state.abilityInUse,
      pendingWard: state.pendingWard,
      destroyedTraps: state.destroyedTraps,
      pinnedTraps: state.pinnedTraps,
      seals: sealViews(state),
      specters: specterViews(state),
      pendingPlunder: state.pendingPlunder,
    }),
    durationMs: 0,
  };
}

/**
 * How long an ability's use holds the playback: Transmutation's throw and smoke play out before
 * its card changes; Arrow Rain's archer only aims before the volley (its own event) flies.
 */
function abilityUsedMs(ability: AbilityId, timings: PlaybackTimings): number {
  if (ability === "transmutation") return timings.transmuteThrowMs;
  if (ability === "arrowRain") return timings.arrowAimMs;
  return timings.noticeMs;
}

/** An ability notice over the player's tile. */
function abilityEffect(
  view: MatchView,
  playerId: PlayerId,
  kind: "abilityReady" | "abilityUsed",
  id: AbilityId,
  energyGained: number,
): TileEffectView {
  const tile = view.players.find((player) => player.id === playerId)?.position ?? 0;
  return { kind, playerId, from: tile, to: tile, ability: { id, energyGained } };
}
