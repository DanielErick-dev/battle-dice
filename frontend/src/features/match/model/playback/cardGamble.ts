/** Card Jester: the gamble and its stolen cards. */
import { throwOnPile } from "@/game/domain/deck";
import { withPlayer, type MatchView } from "../matchView";
import type { StepHandlers } from "./types";

export const cardGambleSteps: StepHandlers<"gambleRolled" | "cardsStolen"> = {
  gambleRolled: (event, timings) => {
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
          const gamble = {
            value: event.value,
            won: event.won,
            fortune: event.fortune,
          };
          return {
            ...view,
            isRolling: false,
            effect: { kind: "gamble", playerId: event.playerId, from: tile, to: tile, gamble },
          };
        },
        durationMs: timings.noticeMs,
      },
    ];
  },
  cardsStolen: (event, timings) => {
    // Each card is shown as it's taken, then lands in the taker's hand (or discard pile, when full).
    return event.cards.flatMap((card) => {
      const kept = !event.discarded.some((discarded) => discarded.uid === card.uid);
      return [
        {
          apply: (view: MatchView) => ({
            ...withPlayer(view, event.from, (player) => ({
              hand: player.hand.filter((held) => held.uid !== card.uid),
            })),
            drawing: {
              id: (view.drawing?.id ?? 0) + 1,
              playerId: event.playerId,
              card,
              takenFrom: view.players.find((player) => player.id === event.from)?.name,
            },
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
  },
};
