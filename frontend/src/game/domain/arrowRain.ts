import { ARROW_RAIN_PINS, ARROW_RAIN_PUSH } from "./abilities";
import { GameRuleError } from "./commands";
import { getTile, opponentsInReach } from "./board";
import { playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import { relocateHiddenTrap } from "./hiddenTraps";
import { threatAt } from "./landing";
import type { Board, PlayerId, TileId } from "./types";

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
