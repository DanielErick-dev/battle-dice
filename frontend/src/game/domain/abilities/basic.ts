import { drawCard } from "../cards/hand";
import { updatePlayer, type Draft } from "../core/draft";
import type { AbilityId, PlayerId } from "@/game/domain/types";

// The abilities with no mechanic of their own: a number that changes the turn, the roll or the hand.

export const TAILWIND_BONUS = 4;
export const DORMANT_FURY_MULTIPLIER = 3;
export const STUDY_DRAWS = 2;
/** Own turns, counting the one it's used on. */
export const LEVITATION_TURNS = 2;

export function cardsPerTurn(abilityInUse: AbilityId | null): number {
  return abilityInUse === "doubleCast" ? 2 : 1;
}

export function rollBonus(abilityInUse: AbilityId | null): number {
  return abilityInUse === "tailwind" ? TAILWIND_BONUS : 0;
}

export function rollMultiplier(abilityInUse: AbilityId | null): number {
  return abilityInUse === "dormantFury" ? DORMANT_FURY_MULTIPLIER : 1;
}

export function studySession(draft: Draft, playerId: PlayerId): void {
  for (let draw = 0; draw < STUDY_DRAWS; draw++) drawCard(draft, playerId);
}

export function levitate(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ levitating: LEVITATION_TURNS }));
}
