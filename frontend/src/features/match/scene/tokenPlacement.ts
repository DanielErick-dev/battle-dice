/** Where figures stand on the board and which way they face. */
import { getTile } from "@/game/domain/board";
import type { Board, Player } from "@/game/domain/types";
import type { MatchView } from "../model/matchView";
import { tileOffsetFor, TILE_SIZE, type BoardLayout, type Vec3 } from "./boardLayout";
import { LEVITATE_HEIGHT } from "./character/figure";

/** How far ahead of the one he trampled the Berserker stands to shove them, face to face. */
const SHOVE_GAP = TILE_SIZE * 0.45;

/** Which way the path runs at a tile (towards the next one; into the finish on the last). */
export function pathDirection(board: Board, layout: BoardLayout, tile: number): Vec3 {
  const { next, previous } = getTile(board, tile);
  const [from, to] = next !== null ? [tile, next] : [previous ?? tile, tile];
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return [x2 - x1, 0, z2 - z1];
}

/** The angle round the vertical a figure faces when looking along `direction` (0 = +z). */
export function headingAlong([x, , z]: Vec3): number {
  return Math.hypot(x, z) < 1e-4 ? 0 : Math.atan2(x, z);
}

/** Where a player's figure is: on their tile, raised while they levitate. */
export function tokenPosition(view: MatchView, layout: BoardLayout, playerId: string): Vec3 {
  const player = view.players.find((candidate) => candidate.id === playerId);
  if (!player) return [0, 0, 0];
  const [x, y, z] = layout.position(player.position);
  return [x, y + (player.levitating > 0 ? LEVITATE_HEIGHT : 0), z];
}

/** Where a figure heads: its tile (shifted aside when shared), unless a trample places it. */
export function tokenTarget(player: Player, view: MatchView, board: Board, layout: BoardLayout): Vec3 {
  const trampled = trampleTarget(player.id, view, board, layout);
  if (trampled) return trampled;
  const [x, y, z] = layout.position(player.position);
  const [ax, , az] = pathDirection(board, layout, player.position);
  const [dx, , dz] = tileOffsetFor(player, view.players, [ax, az], player.position === board.startTile);
  return [x + dx, y, z + dz];
}

/**
 * A trample puts the one trampled mid-tile until they're sent flying, and the Berserker just ahead
 * of them along the path until he runs on.
 */
function trampleTarget(playerId: string, view: MatchView, board: Board, layout: BoardLayout): Vec3 | null {
  const trample = view.fx.trample;
  if (
    !trample ||
    trample.susanoo ||
    (playerId !== trample.by && (playerId !== trample.victim || trample.phase !== "shove"))
  )
    return null;
  const [x, y, z] = layout.position(trample.tile);
  if (playerId === trample.victim) return [x, y, z];
  const [dx, , dz] = pathDirection(board, layout, trample.tile);
  const length = Math.hypot(dx, dz) || 1;
  return [x + (dx / length) * SHOVE_GAP, y, z + (dz / length) * SHOVE_GAP];
}
