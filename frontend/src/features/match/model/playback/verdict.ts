import { nextFxId, withFx, withPlayer, type MatchView, type VerdictView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

export const verdictSteps: StepHandlers<"verdictPassed" | "hiddenTrapDisarmed"> = {
  verdictPassed: (event, timings) => {
    // The scale weighs over the attacker, then drops on their side; what they aimed plays out next, turned on them.
    const scale = (view: MatchView, phase: VerdictView["phase"]): VerdictView => ({
      id: phase === "weigh" ? nextFxId(view.fx.verdict) : (view.fx.verdict?.id ?? 1),
      judgeId: event.playerId,
      attackerId: event.attackerId,
      phase,
    });
    return [
      {
        apply: (view) => ({
          ...withFx(
            withPlayer(view, event.playerId, () => ({ abilityCharge: 0 })),
            { verdict: scale(view, "weigh") },
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
      { apply: (view) => withFx(view, { verdict: scale(view, "tip") }), durationMs: timings.verdictTipMs },
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
