import { currentPlayer } from "@/game/domain/engine";
import type { GameState, Player, PlayerId, TileId } from "@/game/domain/types";

export type TileEffectKind = "portal" | "trap" | "advance" | "extraTurn" | "skipTurn" | "turnSkipped";

/** A tile effect (or turn notice) being shown. For effects without travel, `from` and `to` are the same tile. */
export interface TileEffectView {
  kind: TileEffectKind;
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
  /**
   * The throw in progress or last thrown, known from the moment it starts so the 3D die can
   * land on it. `id` changes on every throw. The HUD keeps using `lastRoll`, revealed later.
   */
  roll: { id: number; value: number } | null;
  /** Player charged with ki (rolled a 6 or hit an advance tile) until their move ends. */
  poweredPlayerId: PlayerId | null;
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
    roll: null,
    poweredPlayerId: null,
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
