import { getTile } from "./board";
import { isUntouchable } from "../core/playerStatus";
import type { Board, Player, PlayerId, TileId } from "@/game/domain/types";

/** Both on the main path or in the same realm track: a realm is cut off from the board. */
export function sameSpace(board: Board, a: TileId, b: TileId): boolean {
  return (getTile(board, a).track?.portal ?? null) === (getTile(board, b).track?.portal ?? null);
}

/** Opponents in the same place who aren't untouchable. */
export function opponentsInReach(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  return opponentsInSpace(board, players, playerId).filter((player) => !isUntouchable(player));
}

/** Untouchable ones included: aimed at them, an ability is thrown and turned away (see aimWard). */
export function opponentsInSpace(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  const here = players.find((player) => player.id === playerId)?.position;
  if (here === undefined) return [];
  return players.filter((player) => player.id !== playerId && sameSpace(board, player.position, here));
}
