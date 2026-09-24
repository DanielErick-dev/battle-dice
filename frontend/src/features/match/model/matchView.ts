import { currentPlayer } from "@/game/domain/engine";
import type { CardInstance, GameState, Player, PlayerId, TileId } from "@/game/domain/types";

export type TileEffectKind =
  | "portal"
  | "trap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "turnSkipped"
  | "trapBlocked"
  | "teleport";

/** A card being played; `id` changes on every cast so the scene and audio can react once. */
export interface CardCastView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
  targetId: PlayerId | null;
  value: number | null;
}

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
  /** Faces of the last revealed roll (two under Kaioken); empty before the first. */
  lastRoll: readonly number[];
  isRolling: boolean;
  /**
   * The throw in progress or last thrown, known from the moment it starts so the 3D die can
   * land on it. `id` changes on every throw. The HUD keeps using `lastRoll`, revealed later.
   */
  roll: { id: number; dice: readonly number[] } | null;
  /** Player charged with ki (rolled a 6 or hit an advance tile) until their move ends. */
  poweredPlayerId: PlayerId | null;
  effect: TileEffectView | null;
  winnerId: PlayerId | null;
  cast: CardCastView | null;
  /** Card drawn most recently, to highlight it in the hand. */
  lastDrawnUid: string | null;
  /** Hand overflowed: waiting for this player to discard one of these. */
  pendingDiscard: { playerId: PlayerId; drawn: CardInstance } | null;
  cardPlayedThisTurn: boolean;
  isAnimating: boolean;
  error: string | null;
}

export function createInitialView(state: GameState): MatchView {
  return {
    players: state.players,
    activePlayerId: currentPlayer(state).id,
    movingPlayerId: null,
    lastRoll: [],
    isRolling: false,
    roll: null,
    poweredPlayerId: null,
    effect: null,
    winnerId: state.winnerId,
    cast: null,
    lastDrawnUid: null,
    pendingDiscard: state.pendingDiscard,
    cardPlayedThisTurn: state.cardPlayedThisTurn,
    isAnimating: false,
    error: null,
  };
}

export function canRoll(view: MatchView): boolean {
  return !view.isAnimating && view.winnerId === null && view.pendingDiscard === null;
}

/** The active player may play a card now (ki and card choice are checked per card). */
export function canPlayCard(view: MatchView): boolean {
  return canRoll(view) && !view.cardPlayedThisTurn;
}

export function withPlayer(view: MatchView, playerId: PlayerId, patch: (player: Player) => Partial<Player>): MatchView {
  return {
    ...view,
    players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch(player) } : player)),
  };
}

export function withPlayerAt(view: MatchView, playerId: PlayerId, position: TileId): MatchView {
  return withPlayer(view, playerId, () => ({ position }));
}
