import { getTile } from "@/game/domain/board/board";
import { DICE_SIDES } from "@/game/domain/core/dice";
import type { Board } from "@/game/domain/types";
import type { BoardLayout } from "@/features/shared/board/boardLayout";
import type { MatchView } from "../../model/matchView";

/** Tracks showing: someone is on them, or their gate is opening right now. */
export function openTrackPortals(view: MatchView, board: Board): Set<number> {
  const portals = new Set<number>();
  for (const player of view.players) {
    const portal = getTile(board, player.position).track?.portal;
    if (portal !== undefined) portals.add(portal);
  }
  if (view.effect?.kind === "realmEnter") {
    const { from } = view.effect;
    const track = board.tracks.find((candidate) => candidate.entries.some((entry) => entry.portal === from));
    portals.add(track?.portal ?? from);
  }
  return portals;
}

/** Tiles the active player can land on with the next roll, shown only while waiting for it. */
export function reachableTiles(view: MatchView, board: Board): Set<number> {
  if (view.isAnimating || view.winnerId !== null) return new Set();
  let tile: number | null =
    view.players.find((player) => player.id === view.activePlayerId)?.position ?? board.startTile;
  const tiles = new Set<number>();
  for (let step = 1; step <= DICE_SIDES; step++) {
    tile = getTile(board, tile).next;
    if (tile === null) break;
    tiles.add(tile);
  }
  return tiles;
}

/** Angle from one tile to another on the face texture (canvas x = world x, canvas y = world z). */
export function directionBetween(layout: BoardLayout, from: number, to: number): number {
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return Math.atan2(z2 - z1, x2 - x1);
}
