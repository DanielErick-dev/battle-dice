/** Seraphiel: the crown, the Fall and Hell's Drag. */
import { withPlayer, type MatchView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const seraphSteps: StepHandlers<"seraphFell" | "crownGained" | "heavenBarred" | "graceOffered" | "hellDragged"> =
  {
    seraphFell: (event, timings) => {
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, () => ({
              ability: "hellsDrag",
              blessings: [],
              crown: "infernal",
            })),
            effect: {
              ...playerTileEffect(view, event.playerId, "fallen"),
              crown: "infernal",
            },
          }),
          durationMs: timings.fallMs,
        },
      ];
    },
    crownGained: (event, timings) => {
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, () => ({ crown: event.crown })),
            effect: {
              ...playerTileEffect(view, event.playerId, "crown"),
              crown: event.crown,
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];
    },
    heavenBarred: (event, timings) => {
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              skipTurns: player.skipTurns + event.rounds,
              chained: player.chained + event.rounds,
            })),
            effect: {
              kind: "heavenBarred",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];
    },
    graceOffered: (event) => {
      return [
        {
          apply: (view) => ({
            ...view,
            pendingGrace: {
              playerId: event.playerId,
              tile: event.tile,
              offer: event.offer,
            },
          }),
          durationMs: 0,
        },
      ];
    },
    hellDragged: (event, timings) => {
      // The hand rises under the victim and closes on them, sinks back with them, and they're in hell.
      const drag = (view: MatchView, phase: "grab" | "sink" | "over") => ({
        id: phase === "grab" ? (view.drag?.id ?? 0) + 1 : (view.drag?.id ?? 1),
        playerId: event.playerId,
        targetId: event.targetId,
        from: event.from,
        phase,
      });
      return [
        {
          apply: (view) => ({ ...view, drag: drag(view, "grab") }),
          durationMs: timings.dragGrabMs,
        },
        {
          apply: (view) => ({ ...view, drag: drag(view, "sink") }),
          durationMs: timings.dragSinkMs,
        },
        {
          apply: (view) => {
            const moved = withPlayer(view, event.targetId, () => ({
              position: event.to,
            }));
            return {
              ...moved,
              drag: drag(view, "over"),
              effect: {
                kind: "dragged",
                playerId: event.targetId,
                from: event.from,
                to: event.to,
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];
    },
  };
