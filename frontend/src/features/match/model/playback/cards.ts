/** Drawing, playing, discarding and fusing cards. */
import { cardCost } from "@/game/domain/cards/catalog";
import { throwOnPile } from "@/game/domain/cards/decks";
import type { CardInstance, Player, PlayerId } from "@/game/domain/types";
import type { PlaybackTimings } from "../../config";
import { nextFxId, withFx, withPlayer, withPlayerAt, type MatchView } from "../matchView";
import type { PlaybackStep, StepHandlers } from "./types";

/** A card taken from the deck or the discard pile: shown in the middle of the screen, then dealt to the hand. */
function revealThenDeal(
  playerId: PlayerId,
  card: CardInstance,
  takeOut: (player: Player) => Partial<Player>,
  timings: PlaybackTimings,
): PlaybackStep[] {
  return [
    {
      apply: (view: MatchView) =>
        withFx(withPlayer(view, playerId, takeOut), { drawing: { id: nextFxId(view.fx.drawing), playerId, card } }),
      durationMs: timings.drawRevealMs,
    },
    {
      apply: (view: MatchView) => ({
        ...withFx(
          withPlayer(view, playerId, (player) => ({ hand: [...player.hand, card] })),
          { drawing: null },
        ),
        lastDrawnUid: card.uid,
      }),
      durationMs: timings.drawMs,
    },
  ];
}

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
    return event.cards.flatMap((card) =>
      revealThenDeal(
        event.playerId,
        card,
        (player) => ({ discard: player.discard.filter((discarded) => discarded.uid !== card.uid) }),
        timings,
      ),
    );
  },
  cardsFused: (event, timings) => {
    return [
      {
        apply: (view) =>
          withFx(
            withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => !event.used.includes(card.uid)),
            })),
            { fusing: { id: nextFxId(view.fx.fusing), playerId: event.playerId, card: event.card } },
          ),
        durationMs: timings.fusionMs,
      },
      {
        apply: (view) => ({
          ...withFx(
            withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, event.card] })),
            { fusing: null },
          ),
          lastDrawnUid: event.card.uid,
        }),
        durationMs: timings.drawMs,
      },
    ];
  },
  cardDrawn: (event, timings) => {
    return revealThenDeal(
      event.playerId,
      event.card,
      (player) => ({ deck: player.deck.filter((card) => card.uid !== event.card.uid) }),
      timings,
    );
  },
  cardTransmuted: (event, timings) => {
    // The old card dissolves in alchemical fire into the new one, which then flies to the hand.
    return [
      {
        apply: (view) =>
          withFx(view, {
            transmuting: {
              id: nextFxId(view.fx.transmuting),
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
          ...withFx(
            withPlayer(view, event.playerId, (player) => ({
              hand: player.hand
                .filter((card) => card.uid !== event.sacrificed.uid)
                .map((card) => (card.uid === event.from.uid ? event.to : card)),
            })),
            { transmuting: null },
          ),
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
        apply: (view) =>
          withFx(view, { drawing: { id: nextFxId(view.fx.drawing), playerId: event.playerId, card: event.card } }),
        durationMs: timings.drawRevealMs,
      },
      {
        apply: (view) => ({
          ...withFx(view, { drawing: null }),
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
          ...withFx(
            withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => card.uid !== event.card.uid),
              discard: throwOnPile(player.discard, [event.card]),
              energy: player.energy - cardCost(event.card.cardId),
            })),
            { cast: { id: nextFxId(view.fx.cast), ...event } },
          ),
          cardsPlayedThisTurn: view.cardsPlayedThisTurn + 1,
          effect: null,
        }),
        durationMs: timings.castMs,
      },
    ];
  },
};
