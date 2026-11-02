import type { AbilityPower } from "../../abilities/ability";
import { GameRuleError } from "../../core/errors";
import { opponentsInSpace } from "../../board/reach";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { aimAbility } from "../../abilities/aim";
import { VERDICT_MULTIPLIER } from "../themis/verdict";
import type { Board, Player, PlayerId } from "../../types";

export const TIME_ROUNDS = 2;

/** From heaven Cronos can't reach the board; armoured ones are listed and turn it away. */
export function timeTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  return opponentsInSpace(board, players, playerId);
}

/** Stacks with what the target already had; with nobody to aim at, the player gets an extra turn instead. */
export function timeWarp(draft: Draft, playerId: PlayerId, power?: AbilityPower, targetId?: PlayerId): void {
  const targets = timeTargets(draft.state.board, draft.players, playerId);
  if (targets.length === 0) {
    draft.extraTurn = true;
    draft.events.push({ type: "extraTurnGranted", playerId, tile: playerIn(draft, playerId).position });
    return;
  }
  const target = targets.find((candidate) => candidate.id === targetId);
  if (!target || (power !== "halt" && power !== "reverse")) throw new GameRuleError("INVALID_TARGET");
  const aim = aimAbility(draft, playerId, target, "timeWarp");
  if (!aim) return;
  // Themis's verdict bends Cronos's own time instead.
  if (aim.turned) {
    bendTime(draft, aim.by, aim.at, power, TIME_ROUNDS * VERDICT_MULTIPLIER);
    return;
  }
  bendTime(draft, playerId, target.id, power);
  // The gears only start winding again once the bent rounds have gone by.
  updatePlayer(draft, playerId, () => ({ chargeHeld: TIME_ROUNDS }));
}

function bendTime(
  draft: Draft,
  playerId: PlayerId,
  targetId: PlayerId,
  power: "halt" | "reverse",
  rounds = TIME_ROUNDS,
): void {
  updatePlayer(draft, targetId, (player) =>
    power === "halt" ? { skipTurns: player.skipTurns + rounds } : { reversedRolls: player.reversedRolls + rounds },
  );
  draft.events.push({ type: "timeBent", playerId, targetId, power, rounds });
}
