/** What the view says each figure is doing now: the token's motion and its effects follow these. */
import { isSeated } from "@/game/domain/players";
import type { Player } from "@/game/domain/types";
import type { MatchView, TileEffectView } from "../model/matchView";
import { effectKey } from "./effectKey";
import type { TokenSignals } from "./effects";

export function tokenSignals(view: MatchView, player: Player): TokenSignals {
  const { effect } = view;
  const { trample, drag, dash, cast } = view.fx;
  const id = player.id;
  const own = effect?.playerId === id ? effect : null;
  const isDashing = dash?.playerId === id && !dash.arrived;
  return {
    isTeleporting:
      isTeleport(own) ||
      // Thrown back by a Susanoo, they fly the tile back.
      (trample?.susanoo === true && trample.victim === id && trample.phase === "flying"),
    isArriving: view.walkEnd?.playerId === id && view.walkEnd.tile === player.position,
    isDashing,
    isFuryAwake: view.abilityInUse === "dormantFury" && view.activePlayerId === id && !isDashing,
    isActive: view.activePlayerId === id,
    isPowered: view.poweredPlayerId === id,
    // Trampled, they get up off their chair to be shoved.
    isResting: isSeated(player) && !(trample?.victim === id && trample.phase !== "over"),
    shove:
      trample?.by === id && !trample.susanoo && (trample.phase === "shove" || trample.phase === "flying")
        ? trample.id
        : null,
    knocked: trample?.victim === id && trample.phase === "flying" ? trample.id : null,
    hop: own?.kind === "enchanted" && own.enchanted?.owner === id ? effectKey(own) : null,
    dragged:
      drag?.targetId === id && (drag.phase !== "over" || effect?.kind === "dragged")
        ? { id: drag.id, phase: drag.phase }
        : null,
    cast: cast?.playerId === id ? cast : null,
    abilityCast: own?.kind === "abilityUsed" ? effectKey(own) : null,
    fell: own?.kind === "fallen" ? effectKey(own) : null,
    verdict: view.fx.verdict?.judgeId === id ? view.fx.verdict.id : null,
  };
}

const TELEPORTS: ReadonlySet<TileEffectView["kind"]> = new Set([
  "portal",
  "trap",
  "hiddenTrap",
  "teleport",
  "realmEnter",
  "trampled",
]);

function isTeleport(effect: TileEffectView | null): boolean {
  return effect !== null && TELEPORTS.has(effect.kind);
}
