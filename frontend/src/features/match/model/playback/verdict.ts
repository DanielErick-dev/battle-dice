import type { PlayerId } from "@/game/domain/types";
import { nextFxId, withFx, withPlayer, type MatchView, type VerdictView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

/** The giant scale between Themis and `attackerId`: weighing first, then dropping on their side. */
function scale(view: MatchView, judgeId: PlayerId, attackerId: PlayerId, phase: VerdictView["phase"]): VerdictView {
  return {
    id: phase === "weigh" ? nextFxId(view.fx.verdict) : (view.fx.verdict?.id ?? 1),
    judgeId,
    attackerId,
    phase,
  };
}

export const verdictSteps: StepHandlers<"verdictPassed" | "hiddenTrapDisarmed" | "energyWeighed"> = {
  verdictPassed: (event, timings) => {
    // The scale weighs over the attacker, then drops on their side; what they aimed plays out next, turned on them.
    return [
      {
        apply: (view) => ({
          ...withFx(
            withPlayer(view, event.playerId, () => ({ abilityCharge: 0 })),
            { verdict: scale(view, event.playerId, event.attackerId, "weigh") },
          ),
          effect: {
            ...playerTileEffect(view, event.attackerId, "verdict"),
            verdict: {
              judgeName: view.players.find((player) => player.id === event.playerId)?.name ?? "",
              cardId: event.cardId,
              ability: event.ability,
            },
          },
        }),
        durationMs: timings.verdictWeighMs,
      },
      {
        apply: (view) => withFx(view, { verdict: scale(view, event.playerId, event.attackerId, "tip") }),
        durationMs: timings.verdictTipMs,
      },
    ];
  },
  energyWeighed: (event, timings) => {
    // Her scale weighs both players' energy; when it settles each holds their half.
    return [
      {
        apply: (view) => ({
          ...withFx(view, { verdict: scale(view, event.playerId, event.targetId, "weigh") }),
          effect: { ...playerTileEffect(view, event.targetId, "weighed"), count: event.targetEnergy },
        }),
        durationMs: timings.verdictWeighMs,
      },
      {
        apply: (view) =>
          withFx(
            withPlayer(
              withPlayer(view, event.playerId, () => ({ energy: event.energy })),
              event.targetId,
              () => ({
                energy: event.targetEnergy,
              }),
            ),
            { verdict: scale(view, event.playerId, event.targetId, "tip") },
          ),
        durationMs: timings.verdictTipMs,
      },
    ];
  },
  hiddenTrapDisarmed: (event, timings) => {
    return [
      {
        apply: (view) => ({
          ...withPlayer(view, event.playerId, (player) => ({ energy: player.energy + event.energyGained })),
          effect: {
            kind: "disarmed",
            playerId: event.playerId,
            from: event.tile,
            to: event.tile,
            energyGained: event.energyGained,
          },
        }),
        durationMs: timings.noticeMs,
      },
    ];
  },
};
