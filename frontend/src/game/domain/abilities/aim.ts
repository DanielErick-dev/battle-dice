import { aimWard } from "../core/playerStatus";
import { passVerdict, verdictArmed } from "../characters/themis/verdict";
import type { AbilityId, Player, PlayerId } from "@/game/domain/types";
import type { Draft } from "../core/draft";

/** Who an aimed ability strikes, and who it comes from, once the target's protections have had their say. */
export type Aim = { by: PlayerId; at: PlayerId; turned: boolean };

/** Null when a ward turned it away (spent for nothing); an armed Silent Verdict turns it on the thrower. */
export function aimAbility(draft: Draft, playerId: PlayerId, target: Player, ability: AbilityId): Aim | null {
  const ward = aimWard(target);
  if (ward) {
    draft.events.push({ type: "abilityBlocked", playerId, targetId: target.id, ability, ward });
    return null;
  }
  if (verdictArmed(target)) {
    passVerdict(draft, target.id, playerId, { ability });
    return { by: target.id, at: playerId, turned: true };
  }
  return { by: playerId, at: target.id, turned: false };
}
