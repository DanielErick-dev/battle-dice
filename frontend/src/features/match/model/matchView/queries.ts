import { abilityBlocker } from "@/game/domain/abilities/blocker";
import { cardsPerTurn } from "@/game/domain/abilities/basic";
import type { Player } from "@/game/domain/types";
import type { MatchView } from "./view";

export function canRoll(view: MatchView): boolean {
  return (
    !view.isAnimating &&
    view.winnerId === null &&
    view.pendingDiscard === null &&
    view.pendingWard === null &&
    view.pendingGrace === null &&
    view.pendingPlunder === null
  );
}

export function activePlayerOf(view: MatchView): Player | undefined {
  return view.players.find((player) => player.id === view.activePlayerId);
}

/** One, or two with Double Cast. */
export function cardsLeftThisTurn(view: MatchView): number {
  return Math.max(0, cardsPerTurn(view.abilityInUse) - view.cardsPlayedThisTurn);
}

export function canActivateAbility(view: MatchView): boolean {
  const player = activePlayerOf(view);
  return canRoll(view) && player !== undefined && abilityBlocker(player) === null;
}

/** Energy and card choice are checked per card. */
export function canPlayCard(view: MatchView): boolean {
  return canRoll(view) && cardsLeftThisTurn(view) > 0;
}
