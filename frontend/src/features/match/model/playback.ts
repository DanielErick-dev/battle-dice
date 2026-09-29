import { abilityCycle, isReactive, LEVITATION_TURNS, type AbilityId } from "@/game/domain/abilities";
import { cardCost } from "@/game/domain/cards";
import { DICE_SIDES } from "@/game/domain/dice";
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState, PlayerId } from "@/game/domain/types";
import type { PlaybackTimings } from "../config";
import { withPlayer, withPlayerAt, type MatchView, type TileEffectView } from "./matchView";

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
            lastRoll: { dice: event.dice, best: event.best ?? false, bonus: event.bonus ?? 0, total: event.value },
          }),
          durationMs: timings.diceRevealMs,
        },
      ];

    case "playerMoved":
      return event.path.map((tile) => ({
        apply: (view) => withPlayerAt(view, event.playerId, tile),
        durationMs: timings.stepMs,
      }));

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
          durationMs: timings.noticeMs,
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
              discard: [...player.discard, event.card],
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
              discard: [...player.discard, event.card],
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
            lastDrawnUid: null,
            pendingDiscard: null,
            destroyedTraps: [],
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
    }),
    durationMs: 0,
  };
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
