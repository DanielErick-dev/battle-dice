import { aimWard } from "../core/playerStatus";
import { judgeAim } from "../characters/themis/verdict";
import type { AbilityId, Player, PlayerId } from "@/game/domain/types";
import type { Draft } from "../core/draft";

/** Who an aimed ability strikes, and who it comes from, once Themis and the target's protections have had their say. */
export type Aim = { by: PlayerId; at: PlayerId; turned: boolean };

/** A marked attacker meets Themis's verdict (turned on them); otherwise null when a ward turned it away (spent). */
export function aimAbility(draft: Draft, playerId: PlayerId, target: Player, ability: AbilityId): Aim | null {
  const judgeId = judgeAim(draft, playerId, target.id, { ability });
  if (judgeId) return { by: judgeId, at: playerId, turned: true };
  const ward = aimWard(target);
  if (ward) {
    draft.events.push({ type: "abilityBlocked", playerId, targetId: target.id, ability, ward });
    return null;
  }
  return { by: playerId, at: target.id, turned: false };
}
