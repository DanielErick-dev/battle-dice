/** Drawing, playing, discarding and fusing cards. */
import { cardCost } from "@/game/domain/cards";
import { throwOnPile } from "@/game/domain/deck";
import { withPlayer, withPlayerAt, type MatchView } from "../matchView";
import type { StepHandlers } from "./types";

export const cardsSteps: StepHandlers<
  | "cardDrawn"
  | "cardPlayed"
  | "cardDiscarded"
  | "discardRequired"
  | "deckReshuffled"
  | "cardsFused"
  | "cardTeleported"
  | "cardTransmuted"
  | "cardsResurrected"
> = {
  cardTeleported: (event, timings) => {
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
  },
  cardsResurrected: (event, timings) => {
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
  },
  // The three copies leave the hand, and the fused card is shown off as it joins it.
  cardsFused: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({
            hand: player.hand.filter((card) => !event.used.includes(card.uid)),
          })),
          fusing: {
            id: (view.fusing?.id ?? 0) + 1,
            playerId: event.playerId,
            card: event.card,
          },
        }),
        durationMs: timings.fusionMs,
      },
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({
            hand: [...player.hand, event.card],
          })),
          fusing: null,
          lastDrawnUid: event.card.uid,
        }),
        durationMs: timings.drawMs,
      },
    ];
  },
  cardDrawn: (event, timings) => {
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
  },
  cardTransmuted: (event, timings) => {
    // The old card shows, dissolves in alchemical fire into the new one, which then flies to the hand.
    return [
      {
        apply: (view) => ({
          ...view,
          transmuting: {
            id: (view.transmuting?.id ?? 0) + 1,
            playerId: event.playerId,
            from: event.from,
            sacrificed: event.sacrificed,
            to: event.to,
          },
        }),
        durationMs: timings.transmuteMs,
      },
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({
            hand: player.hand
              .filter((card) => card.uid !== event.sacrificed.uid)
              .map((card) => (card.uid === event.from.uid ? event.to : card)),
          })),
          transmuting: null,
          lastDrawnUid: event.to.uid,
        }),
        durationMs: timings.drawMs,
      },
    ];
  },
  deckReshuffled: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({ deck: player.discard, discard: [] })),
        }),
        durationMs: timings.drawMs,
      },
    ];
  },
  discardRequired: (event, timings) => {
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
  },
  cardDiscarded: (event, timings) => {
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
  },
  cardPlayed: (event, timings) => {
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
  },
};
