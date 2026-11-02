import { isAbilityReady } from "../../abilities/charge";
import { gainEnergy } from "../../core/energy";
import type { AbilityId } from "../../abilities/ability";
import type { CardId } from "../../cards/catalog";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import type { Player, PlayerId } from "../../core/state";

/** What an attack turned by her verdict does to the attacker, against what it would have done to its target. */
export const VERDICT_MULTIPLIER = 2;

/** Marks an attacker needs before their next attack on someone else goes before her (their third, at 2). */
export const MARKS_TO_JUDGE = 2;

/** What each verdict pays the judge: energy, and a head start on her next charge. */
export const VERDICT_ENERGY = 2;
export const VERDICT_CHARGE = 1;

export type VerdictAim = { cardId: CardId } | { ability: AbilityId };

/** Her Silent Verdict, charged: the next attack aimed at her, or a marked opponent's at anyone, turns on them. */
export function verdictArmed(player: Player): boolean {
  return player.ability === "silentVerdict" && isAbilityReady(player);
}

/** The judge in this match, unless it's the attacker themself (her own attacks are never judged). */
function judgeOf(draft: Draft, attackerId: PlayerId): Player | null {
  return draft.players.find((player) => player.ability === "silentVerdict" && player.id !== attackerId) ?? null;
}

/**
 * An attack aimed at `targetId`, put before Themis. With her verdict armed, one aimed at her, or a fully marked
 * attacker's at anyone, is turned on the attacker (the caller strikes them from her, doubled, and gets her id).
 * A fully marked attacker who finds her unarmed gets away with it and starts over; anyone else gains a mark.
 */
export function judgeAim(draft: Draft, attackerId: PlayerId, targetId: PlayerId, aim: VerdictAim): PlayerId | null {
  const judge = judgeOf(draft, attackerId);
  if (!judge) return null;
  const marked = playerIn(draft, attackerId).justiceMarks >= MARKS_TO_JUDGE;
  if (verdictArmed(judge) && (targetId === judge.id || marked)) {
    passVerdict(draft, judge.id, attackerId, targetId, aim);
    return judge.id;
  }
  if (marked) clearMarks(draft, judge.id, attackerId);
  else markForJustice(draft, judge.id, attackerId);
  return null;
}

/** The attacker's marks wiped clean, their count back to nothing. */
function clearMarks(draft: Draft, judgeId: PlayerId, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ justiceMarks: 0 }));
  draft.events.push({ type: "justiceMarked", playerId, by: judgeId, marks: 0 });
}

/** One more Mark of Justice on `playerId`. */
export function markForJustice(draft: Draft, judgeId: PlayerId, playerId: PlayerId): void {
  updatePlayer(draft, playerId, (player) => ({ justiceMarks: player.justiceMarks + 1 }));
  draft.events.push({ type: "justiceMarked", playerId, by: judgeId, marks: playerIn(draft, playerId).justiceMarks });
}

/** Spends her verdict (it pays her) and the attacker's marks; whoever they aimed at (if not her) is left untouched. */
function passVerdict(draft: Draft, judgeId: PlayerId, attackerId: PlayerId, targetId: PlayerId, aim: VerdictAim) {
  updatePlayer(draft, judgeId, () => ({ abilityCharge: VERDICT_CHARGE }));
  const energyGained = gainEnergy(draft, judgeId, VERDICT_ENERGY);
  updatePlayer(draft, attackerId, () => ({ justiceMarks: 0 }));
  draft.events.push({
    type: "verdictPassed",
    playerId: judgeId,
    attackerId,
    energyGained,
    ...(targetId !== judgeId && { defendedId: targetId }),
    ...aim,
  });
}
