import type { PlayerId } from "@/game/domain/types";
import { VERDICT_CHARGE } from "@/game/domain/characters/themis/verdict";
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

const nameIn = (view: MatchView, id: PlayerId) => view.players.find((player) => player.id === id)?.name;

export const verdictSteps: StepHandlers<
  "verdictPassed" | "justiceMarked" | "justiceMarched" | "decreeIssued" | "finalJudgment"
> = {
  verdictPassed: (event, timings) => {
    // The scale weighs over the attacker, then drops on their side; what they aimed plays out next, turned on them.
    return [
      {
        apply: (view) => ({
          ...withFx(
            withPlayer(
              withPlayer(view, event.playerId, (judge) => ({
                abilityCharge: VERDICT_CHARGE,
                energy: judge.energy + event.energyGained,
              })),
              event.attackerId,
              () => ({ justiceMarks: 0 }),
            ),
            { verdict: scale(view, event.playerId, event.attackerId, "weigh") },
          ),
          effect: {
            ...playerTileEffect(view, event.attackerId, "verdict"),
            verdict: {
              judgeName: nameIn(view, event.playerId) ?? "",
              defendedName: event.defendedId && nameIn(view, event.defendedId),
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
  justiceMarked: (event, timings) => [
    {
      apply: (view) => ({
        ...withPlayer(view, event.playerId, () => ({ justiceMarks: event.marks })),
        effect: { ...playerTileEffect(view, event.playerId, "marked"), count: event.marks },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  justiceMarched: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: { ...playerTileEffect(view, event.playerId, "marched"), count: event.tiles },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  decreeIssued: (event, timings) => [
    {
      apply: (view) => ({
        ...event.targetIds.reduce((next, id) => withPlayer(next, id, () => ({ containedRolls: event.rolls })), view),
        effect: { ...playerTileEffect(view, event.playerId, "decree"), count: event.rolls },
      }),
      durationMs: timings.noticeMs,
    },
  ],
  finalJudgment: (event, timings) => [
    {
      apply: (view) => ({
        ...view,
        effect: {
          ...playerTileEffect(view, event.playerId, "judgment"),
          count: event.tiles,
          judgment: { die: event.die, distance: event.distance },
        },
      }),
      durationMs: timings.verdictWeighMs,
    },
  ],
};
