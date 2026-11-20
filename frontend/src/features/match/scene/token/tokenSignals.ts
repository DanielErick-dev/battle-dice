/** What the view says each figure is doing now: the token's motion and its effects follow these. */
import { isSeated } from "@/game/domain/core/playerStatus";
import type { Player } from "@/game/domain/types";
import type { MatchView, TileEffectView } from "../../model/matchView";
import { effectKey } from "../vfx/effectKey";
import type { TokenSignals } from "../effects";

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
    // Trampled, they get up off their chair to be shoved; carried along a walk, they only sit back down at its end.
    isResting:
      isSeated(player) &&
      !(trample?.victim === id && trample.phase !== "over") &&
      !(view.walkEnd?.playerId === id && view.walkEnd.tile !== player.position),
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
    outburst: outburstOf(view, id, own),
    weeded: own?.kind === "weeded" ? effectKey(own) : null,
    // Only stepping onto a wall's tile mid-walk crosses it: a wall raised under someone, or a teleport onto it, doesn't.
    overWall: view.walkEnd?.playerId === id && view.elementals.walls.some((wall) => wall.tile === player.position),
    meditating: player.tenzai.converged > 0,
    // The limp read as a stutter (and threw the camera off): they run back normally now.
    limping: false,
  };
}

/** Tenzai's gesture for each element he bends. */
const BENDING_CLIPS = { earth: "quake", water: "tide", fire: "flare", wind: "gust" } as const;

/** A one-off clip the figure acts out: Akane's fury, Tenzai bending, punching a wall. */
function outburstOf(view: MatchView, id: string, own: TileEffectView | null): TokenSignals["outburst"] {
  const { blaze, bending } = view.fx;
  if (blaze?.playerId === id && blaze.act) return { id: blaze.id, clip: blaze.act };
  // The burst at a tile or on a bond's target is the element arriving, not him casting it.
  if (bending?.playerId === id && bending.tile === undefined && bending.targetId === undefined) {
    const clip = bending.kind in BENDING_CLIPS ? BENDING_CLIPS[bending.kind as keyof typeof BENDING_CLIPS] : null;
    if (clip) return { id: 1000 + bending.id, clip };
  }
  if (own?.kind === "wallHit") return { id: 2000 + effectKey(own), clip: "punch" };
  return null;
}

const TELEPORTS: ReadonlySet<TileEffectView["kind"]> = new Set([
  "portal",
  "hiddenTrap",
  "teleport",
  "realmEnter",
  "trampled",
]);

function isTeleport(effect: TileEffectView | null): boolean {
  return effect !== null && TELEPORTS.has(effect.kind);
}
