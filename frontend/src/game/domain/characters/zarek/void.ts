import { isAbilityReady } from "../../abilities/charge";
import { getTile } from "../../board/board";
import { updatePlayer, type Draft } from "../../core/draft";
import { HIDDEN_TRAP_PUSH } from "../../board/hiddenTraps";
import type { VoidHarm, VoidItem } from "./types";
import type { Board, Threat, TileId } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";

/** Things Zarek's Void holds at once. */
export const VOID_CAPACITY = 4;
/** Paid to set a harm down with its penalty doubled. */
export const VOID_DOUBLE_ENERGY = 2;
/** The setback of the purple trap left where the Void took a spell. */
export const VOID_SCAR_BACK = 4;

/** Ready, with room left in the Void. */
export function canSwallow(player: Player): boolean {
  return player.ability === "theVoid" && isAbilityReady(player) && player.voidHold.length < VOID_CAPACITY;
}

export function offerSwallow(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  draft.pendingWard = { tile, threat };
  draft.events.push({ type: "wardOffered", playerId, tile, threat });
}

/** The harm on `tile` goes into the Void and the tile is left harmless for good. */
export function swallow(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  updatePlayer(draft, playerId, () => ({ abilityCharge: 0 }));
  draft.events.push({ type: "abilityUsed", playerId, ability: "theVoid" });
  devour(draft, playerId, tile, threat);
}

/** Swallowing without the ability (Hungry Rift): the harm goes in, the charge stays. */
export function devour(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  const item = harmItem(draft, tile, threat);
  const hidden = threat === "hiddenTrap";
  if (hidden) draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
  if (!draft.destroyedTraps.includes(tile)) draft.destroyedTraps = [...draft.destroyedTraps, tile];
  draft.pinnedTraps = draft.pinnedTraps.filter((pinned) => pinned !== tile);
  updatePlayer(draft, playerId, (player) => ({ voidIdle: 0, voidHold: [...player.voidHold, item] }));
  draft.events.push({ type: "voidSwallowed", playerId, tile, item, hidden });
}

function harmItem(draft: Draft, tile: TileId, threat: Threat): VoidItem {
  const { board } = draft.state;
  const { effect } = getTile(board, tile);
  if (threat === "hiddenTrap") return { kind: "trap", back: HIDDEN_TRAP_PUSH };
  if (threat === "skipTurn") return { kind: "skipTurn" };
  if (effect.kind === "curse") return { kind: "curse", curse: effect.curse };
  if (effect.kind !== "trap") throw new Error(`No harm to swallow on tile ${tile}`);
  const back = stepsBack(board, tile, effect.to);
  return effect.curse ? { kind: "trap", back, curse: effect.curse } : { kind: "trap", back };
}

/** Along the way back (rifts included), or the plain difference when `to` isn't behind. */
function stepsBack(board: Board, from: TileId, to: TileId): number {
  let tile: TileId | null = from;
  for (let steps = 0; tile !== null && steps <= board.tiles.length; steps++) {
    if (tile === to) return Math.max(1, steps);
    tile = getTile(board, tile).previous;
  }
  return Math.max(1, Math.abs(from - to));
}

export function isHarm(item: VoidItem): item is VoidHarm {
  return item.kind === "trap" || item.kind === "curse" || item.kind === "skipTurn";
}
