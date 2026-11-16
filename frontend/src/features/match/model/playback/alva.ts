/** Unidade Alva: her EMP, the Memory Overload, Corrupted Cards and her five cards. */
import { withPlayer } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const alvaSteps: StepHandlers<
  | "empPulsed"
  | "memoryOverload"
  | "corruptedInjected"
  | "corruptedPurged"
  | "brownoutSapped"
  | "firewallLocked"
  | "dataCollapsed"
  | "alvaThrust"
  | "apocalypseProtocol"
> = {
  empPulsed: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "emp"), count: event.victims.length },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  memoryOverload: (event, timings) => [
    {
      apply: (view) => {
        const burnt = new Map(event.burnt.map((entry) => [entry.playerId, entry.cards]));
        const count = event.burnt.reduce((sum, entry) => sum + entry.cards.length, 0);
        return {
          ...view,
          players: view.players.map((player) => {
            const cards = burnt.get(player.id);
            if (!cards) return player;
            const gone = new Set(cards.map((card) => card.uid));
            return {
              ...player,
              hand: player.hand.filter((card) => !gone.has(card.uid)),
              discard: [...player.discard, ...cards],
            };
          }),
          effect: { ...playerTileEffect(view, event.playerId, "memoryOverload"), count },
        };
      },
      durationMs: timings.noticeMs,
    },
  ],
  corruptedInjected: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.targetId, (player) => ({ corrupted: player.corrupted + event.count })),
        effect: { ...playerTileEffect(view, event.targetId, "corrupted"), count: event.count },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  corruptedPurged: (event) => [
    {
      apply: (view) =>
        withPlayer(view, event.playerId, (player) => ({
          corrupted: Math.max(0, player.corrupted - 1),
          hand: player.hand.filter((card) => card.uid !== event.card.uid),
          discard: [...player.discard, event.card],
        })),
      durationMs: 0,
    },
  ],
  brownoutSapped: () => [],
  firewallLocked: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.targetId, "firewall"), count: event.turns },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  dataCollapsed: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.targetId, "dataCollapse"), count: event.weight },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  alvaThrust: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "alvaThrust"), count: event.tiles },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  apocalypseProtocol: (event, timings) => [
    {
      apply: (view) => ({ ...view, effect: playerTileEffect(view, event.playerId, "apocalypse") }),
      durationMs: timings.noticeMs,
    },
  ],
};
