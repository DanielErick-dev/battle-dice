import { mainTileOf } from "../../board/board";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { GameRuleError } from "../../core/errors";
import { aimWard, isUntouchable } from "../../core/playerStatus";
import { leadingOpponent } from "../akane/cards";
import { judgeAim } from "../themis/verdict";
import type { CardId } from "../../cards/catalog";
import type { Board } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";
import {
  armBreeze,
  attune,
  bindTether,
  COMBUSTION_MULTIPLIER,
  COMBUSTION_PUSH,
  enchantDie,
  raiseWall,
  snapTether,
  TETHER_TURNS,
  WALL_HP,
  wallTileAhead,
} from "./elements";
import { ELEMENTS, type Element, type Elementals } from "./types";

/** Tectonic Fortification: a new wall's hp when he has none standing. */
export const FORTIFY_NEW_HP = 6;
/** Riptide Lash with no bond: a quick one on the nearest opponent ahead, for this many of his turns. */
export const LASH_TETHER_TURNS = 1;
/** Forced Tailwind: added to the target's next roll. */
export const FORCED_TAILWIND_BONUS = 3;
/** The Elemental Exchange doubles what it turns into. */
export const EXCHANGE_FACTOR = 2;

/** The creation of his the Elemental Exchange spends, of another element than `into`: breeze, then bond, then wall. */
export function exchangeSource(elementals: Elementals, playerId: PlayerId, into: Element | null): Element | null {
  const held: Element[] = [];
  if (elementals.breezes.some((breeze) => breeze.owner === playerId)) held.push("wind");
  if (elementals.tethers.some((tether) => tether.owner === playerId)) held.push("water");
  if (elementals.walls.some((wall) => wall.owner === playerId)) held.push("earth");
  return held.find((element) => element !== into) ?? null;
}

/** The nearest opponent ahead of him, in the same place and not protected: Riptide Lash's quick bond. */
export function lashTarget(board: Board, players: readonly Player[], playerId: PlayerId): Player | null {
  const self = players.find((player) => player.id === playerId);
  if (!self) return null;
  const progress = (player: Player) => mainTileOf(board, player.position, player.realmEntry);
  return (
    players
      .filter((other) => other.id !== playerId && !isUntouchable(other) && progress(other) > progress(self))
      .sort((a, b) => progress(a) - progress(b))[0] ?? null
  );
}

/** Tectonic Fortification: every wall of his doubles its hp; with none standing, a new one rises ahead of the leader. */
export function fortify(draft: Draft, playerId: PlayerId): void {
  const own = draft.elementals.walls.filter((wall) => wall.owner === playerId);
  draft.events.push({ type: "elementBent", playerId, element: "earth" });
  if (own.length > 0) {
    draft.elementals = {
      ...draft.elementals,
      walls: draft.elementals.walls.map((wall) =>
        wall.owner === playerId ? { ...wall, hp: wall.hp * 2, maxHp: wall.maxHp * 2 } : wall,
      ),
    };
    for (const wall of own) draft.events.push({ type: "wallStrengthened", playerId, tile: wall.tile, hp: wall.hp * 2 });
  } else raiseAheadOfLeader(draft, playerId, FORTIFY_NEW_HP);
  attune(draft, playerId, ["earth"]);
}

/** Riptide Lash: trades places with whoever he has bound; with no bond, a quick one on the nearest opponent ahead. */
export function riptideLash(draft: Draft, playerId: PlayerId): void {
  const tether = draft.elementals.tethers.find((candidate) => candidate.owner === playerId);
  draft.events.push({ type: "elementBent", playerId, element: "water" });
  if (tether) {
    const target = playerIn(draft, tether.target);
    if (aimedAway(draft, playerId, target, "riptideLash")) return attune(draft, playerId, ["water"]);
    const self = playerIn(draft, playerId);
    updatePlayer(draft, playerId, () => ({ position: target.position, realmEntry: target.realmEntry }));
    updatePlayer(draft, target.id, () => ({ position: self.position, realmEntry: self.realmEntry }));
    draft.events.push({
      type: "tetherSwapped",
      playerId,
      targetId: target.id,
      from: self.position,
      to: target.position,
    });
  } else {
    const target = lashTarget(draft.state.board, draft.players, playerId);
    if (!target) throw new GameRuleError("NO_TARGET_AHEAD");
    if (!aimedAway(draft, playerId, target, "riptideLash")) bindTether(draft, playerId, target.id, LASH_TETHER_TURNS);
  }
  attune(draft, playerId, ["water"]);
}

/** Forced Tailwind: the target's next roll walks FORCED_TAILWIND_BONUS further, like it or not. */
export function forceTailwind(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  updatePlayer(draft, targetId, (target) => ({
    diceBonuses: [...target.diceBonuses, { amount: FORCED_TAILWIND_BONUS, rolls: 1 }],
  }));
  draft.events.push({ type: "elementBent", playerId, element: "wind" });
  attune(draft, playerId, ["wind"]);
}

/** The Elemental Exchange: one creation of his spent, turned into `into` with its effect doubled. */
export function exchangeElement(draft: Draft, playerId: PlayerId, into: Element | null): void {
  if (!into || !ELEMENTS.includes(into)) throw new GameRuleError("INVALID_ELEMENT");
  const source = exchangeSource(draft.elementals, playerId, into);
  if (!source) throw new GameRuleError("NO_CREATION");
  const oldWall = draft.elementals.walls.find((wall) => wall.owner === playerId);
  if (source === "wind") {
    draft.elementals = {
      ...draft.elementals,
      breezes: draft.elementals.breezes.filter((breeze) => breeze.owner !== playerId),
    };
    draft.events.push({ type: "breezeFaded", playerId });
  } else if (source === "water") snapTether(draft, playerId);
  else if (oldWall) {
    draft.elementals = {
      ...draft.elementals,
      walls: draft.elementals.walls.filter((wall) => wall !== oldWall),
    };
    draft.events.push({ type: "wallCrumbled", owner: playerId, tile: oldWall.tile });
  }
  draft.events.push({ type: "elementBent", playerId, element: into, doubled: true });
  conjure(draft, playerId, into, EXCHANGE_FACTOR);
  attune(draft, playerId, [into]);
}

/** Convergence of the Four: wall, bond, breeze and combustion at once, which wakes the Convergence. */
export function convergeAll(draft: Draft, playerId: PlayerId): void {
  for (const element of ELEMENTS) {
    draft.events.push({ type: "elementBent", playerId, element });
    conjure(draft, playerId, element, 1);
  }
  attune(draft, playerId, ELEMENTS);
}

/** One element's creation, `factor` times as strong; the wall and the bond go to the leading opponent. */
function conjure(draft: Draft, playerId: PlayerId, element: Element, factor: number): void {
  switch (element) {
    case "earth":
      raiseAheadOfLeader(draft, playerId, WALL_HP * factor);
      return;
    case "water": {
      const leader = leadingOpponent(draft, playerId);
      if (leader && !aimedAway(draft, playerId, leader, "elementalConvergence"))
        bindTether(draft, playerId, leader.id, TETHER_TURNS * factor);
      return;
    }
    case "fire":
      enchantDie(draft, playerId, COMBUSTION_MULTIPLIER * factor, COMBUSTION_PUSH * factor);
      return;
    case "wind":
      armBreeze(draft, playerId, factor > 1);
      return;
  }
}

function raiseAheadOfLeader(draft: Draft, playerId: PlayerId, hp: number): void {
  const leader = leadingOpponent(draft, playerId);
  const tile = leader && wallTileAhead(draft, leader);
  if (tile !== null && tile !== undefined) raiseWall(draft, playerId, tile, hp);
}

/** A card of his that finds its own target: Themis's verdict undoes it, a ward turns it away. */
function aimedAway(draft: Draft, playerId: PlayerId, target: Player, cardId: CardId): boolean {
  if (judgeAim(draft, playerId, target.id, { cardId })) return true;
  const ward = aimWard(target);
  if (!ward) return false;
  draft.events.push({ type: "cardBlocked", playerId, targetId: target.id, cardId, ward });
  return true;
}
