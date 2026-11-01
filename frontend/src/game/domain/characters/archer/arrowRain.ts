import { GameRuleError } from "../../core/errors";
import { getTile } from "../../board/board";
import { opponentsInReach } from "../../board/reach";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { pushPath } from "../../board/paths";
import { relocateHiddenTrap } from "../../board/hiddenTraps";
import { threatAt } from "../../board/harm";
import type { Board, TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

export const ARROW_RAIN_PUSH = 10;
export const ARROW_RAIN_PINS = 3;

/** Knocks back every opponent in reach, or pins the next threats ahead, revealing hidden traps among them. */
export function loseArrowRain(draft: Draft, playerId: PlayerId, volley: "opponents" | "traps" = "traps"): void {
  const { board } = draft.state;
  if (volley === "opponents") {
    const targets = opponentsInReach(board, draft.players, playerId);
    if (targets.length === 0) throw new GameRuleError("INVALID_TARGET");
    draft.events.push({
      type: "arrowsLoosed",
      playerId,
      targets: targets.map((target) => target.position),
      pinned: [],
      hidden: [],
    });
    for (const target of targets) {
      const path = pushPath(board, target.position, ARROW_RAIN_PUSH, target.realmEntry);
      draft.events.push({ type: "playerPushed", playerId: target.id, by: playerId, path });
      updatePlayer(draft, target.id, () => ({ position: path.at(-1) ?? target.position }));
    }
    return;
  }

  const pinned = threatsAhead(draft, board, playerIn(draft, playerId).position, ARROW_RAIN_PINS);
  draft.pinnedTraps = [...draft.pinnedTraps, ...pinned];
  draft.events.push({
    type: "arrowsLoosed",
    playerId,
    targets: pinned,
    pinned,
    hidden: pinned.filter((tile) => draft.hiddenTraps.includes(tile)),
  });
}

/** The first `count` unpinned threats ahead. */
function threatsAhead(draft: Draft, board: Board, from: TileId, count: number): TileId[] {
  const found: TileId[] = [];
  let tile = getTile(board, from).next;
  while (tile !== null && found.length < count) {
    if (threatAt(draft, tile)) found.push(tile);
    tile = getTile(board, tile).next;
  }
  return found;
}

/** Called after the landing resolves; a freed hidden trap moves, since the arrows gave its place away. */
export function unpinPassed(draft: Draft, path: readonly TileId[]): void {
  for (const tile of path) {
    if (!draft.pinnedTraps.includes(tile)) continue;
    draft.pinnedTraps = draft.pinnedTraps.filter((pinned) => pinned !== tile);
    if (draft.hiddenTraps.includes(tile)) {
      draft.hiddenTraps = relocateHiddenTrap(draft.state.board, draft.hiddenTraps, tile, draft.random, [
        ...draft.destroyedTraps,
        ...draft.pinnedTraps,
      ]);
    }
    draft.events.push({ type: "trapUnpinned", tile });
  }
}
