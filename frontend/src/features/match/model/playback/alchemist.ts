/** The Alchemist: her Great Inversion, tiles turned round, her Condenser and graveyard picks, the Magnum Opus. */
import { withPlayer } from "../matchView";
import { playerTileEffect, tileOf } from "./helpers";
import type { StepHandlers } from "./types";

export const alchemistSteps: StepHandlers<
  | "inversionStarted"
  | "inversionEnded"
  | "tileInverted"
  | "condenserFed"
  | "graveyardOpened"
  | "graveyardRaided"
  | "magnumOpus"
> = {
  inversionStarted: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        inversion: { owner: event.playerId, turnsLeft: event.turns + 1 },
        effect: { ...playerTileEffect(view, event.playerId, "inversion"), count: event.turns },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  inversionEnded: () => [{ apply: (view) => ({ ...view, inversion: null }), durationMs: 0 }],
  tileInverted: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...tileOf(event), kind: "tileInverted", inverted: event.outcome, count: event.amount },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  condenserFed: (event) => [
    {
      apply: (view) =>
        withPlayer(view, event.playerId, (player) => ({
          alchemist: { ...player.alchemist, condensed: event.condensed },
        })),
      durationMs: 0,
    },
  ],
  graveyardOpened: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "graveyardOpened"), count: event.picks },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  graveyardRaided: (event, timings) => [
    {
      apply: (view) => {
        const taken = new Set(event.cards.map(({ card }) => card.uid));
        const raided = {
          ...view,
          players: view.players.map((player) => ({
            ...player,
            discard: player.discard.filter((card) => !taken.has(card.uid)),
          })),
        };
        return {
          ...withPlayer(raided, event.playerId, (player) => ({
            hand: [...player.hand, ...event.cards.map(({ card }) => card)],
          })),
          lastDrawnUid: event.cards.at(-1)?.card.uid ?? view.lastDrawnUid,
        };
      },
      durationMs: timings.drawMs,
    },
  ],
  magnumOpus: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "magnumOpus"), count: event.taken.length },
      }),
      durationMs: timings.noticeMs,
    },
  ],
};
