import { getTile, linkRift } from "../../board/board";
import { pushPath } from "../../board/paths";
import type { VoidHarm } from "./types";
import type { Board, Tile, TileEffect, TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

/** A new tile appended to the board (every id keeps its place) and linked in right after `after`. */
export function openRift(board: Board, after: TileId, owner: PlayerId, item: VoidHarm, doubled: boolean): Tile {
  const id = board.tiles.length + 1;
  const back = item.kind === "trap" ? item.back * (doubled ? 2 : 1) : undefined;
  const rift: Tile = {
    id,
    role: "rift",
    effect: { kind: "none" },
    next: null,
    previous: null,
    rift: { owner, doubled, after, ...(back !== undefined && { back }) },
  };
  return { ...rift, effect: riftEffect(linkRift(board, rift), id, item, back) };
}

function riftEffect(board: Board, id: TileId, item: VoidHarm, back: number | undefined): TileEffect {
  if (item.kind === "skipTurn") return { kind: "skipTurn" };
  if (item.kind === "curse") return { kind: "curse", curse: item.curse };
  const to = pushPath(board, id, back ?? item.back).at(-1) ?? board.startTile;
  return item.curse ? { kind: "trap", to, curse: item.curse } : { kind: "trap", to };
}

/** The rift tiles in the order they opened, each to be linked in again on the plain board (see linkRift). */
export function riftsOf(board: Board): Tile[] {
  return board.tiles.filter((tile) => tile.role === "rift");
}

/** The plain board with `rifts` linked in, as the screen rebuilds it. */
export function withRifts(board: Board, rifts: readonly Tile[]): Board {
  return rifts.reduce(linkRift, board);
}

/** Rifts close for a new match: each tile links back to its neighbours of the original path. */
export function closeRifts(board: Board): Board {
  const isRift = (id: TileId | null) => id !== null && getTile(board, id).role === "rift";
  const skip = (id: TileId | null, step: (tile: Tile) => TileId | null) => {
    let tile = id;
    while (tile !== null && isRift(tile)) tile = step(getTile(board, tile));
    return tile;
  };
  return {
    ...board,
    tiles: board.tiles
      .filter((tile) => tile.role !== "rift")
      .map((tile) => ({
        ...tile,
        next: skip(tile.next, ({ next }) => next),
        previous: skip(tile.previous, ({ previous }) => previous),
      })),
  };
}
