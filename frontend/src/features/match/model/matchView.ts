import { currentPlayer } from "@/game/domain/engine";
import type { GameState, Player, PlayerId, TileId } from "@/game/domain/types";

export interface TileEffectView {
  kind: "portal" | "trap";
  playerId: PlayerId;
  from: TileId;
  to: TileId;
}

/** What the screen shows right now. Lags behind the authoritative state while animating. */
export interface MatchView {
  players: readonly Player[];
  activePlayerId: PlayerId;
  movingPlayerId: PlayerId | null;
  lastRoll: number | null;
  isRolling: boolean;
  effect: TileEffectView | null;
  winnerId: PlayerId | null;
  isAnimating: boolean;
  error: string | null;
}

export function createInitialView(state: GameState): MatchView {
  return {
    players: state.players,
    activePlayerId: currentPlayer(state).id,
    movingPlayerId: null,
    lastRoll: null,
    isRolling: false,
    effect: null,
    winnerId: state.winnerId,
    isAnimating: false,
    error: null,
  };
}

export function canRoll(view: MatchView): boolean {
  return !view.isAnimating && view.winnerId === null;
}

export function withPlayerAt(view: MatchView, playerId: PlayerId, position: TileId): MatchView {
  return {
    ...view,
    players: view.players.map((player) =>
      player.id === playerId ? { ...player, position } : player,
    ),
  };
}
