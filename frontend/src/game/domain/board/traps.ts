import { getTile } from "./board";
import { playerIn, type Draft } from "../core/draft";
import { tilesAhead } from "./paths";
import type { PlayerId, TileId } from "@/game/domain/types";

/** Gone for good: harmless, no longer hidden nor pinned. The caller announces how it went. */
export function smashTrap(draft: Draft, tile: TileId): void {
  draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
  if (!draft.destroyedTraps.includes(tile)) draft.destroyedTraps = [...draft.destroyedTraps, tile];
  draft.pinnedTraps = draft.pinnedTraps.filter((pinned) => pinned !== tile);
}

/** The next `count` traps ahead, hidden ones too, but not curses (Plasma Cannon, a lonely Hell's Drag). */
export function blastTrapsAhead(draft: Draft, playerId: PlayerId, count: number): void {
  const { board } = draft.state;
  let blasted = 0;
  for (const tile of tilesAhead(board, playerIn(draft, playerId).position)) {
    if (blasted >= count) break;
    const hidden = draft.hiddenTraps.includes(tile);
    if (hidden || (getTile(board, tile).effect.kind === "trap" && !draft.destroyedTraps.includes(tile))) {
      blasted++;
      smashTrap(draft, tile);
      draft.events.push({ type: "trapDestroyed", playerId, tile, hidden });
    }
  }
}
