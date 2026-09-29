import { abilityBlocker, cardsPerTurn, type AbilityId } from "@/game/domain/abilities";
import { currentPlayer } from "@/game/domain/engine";
import type {
  Blessing,
  CardInstance,
  GameState,
  Player,
  PlayerId,
  RealmKind,
  Threat,
  TileId,
  TrapCurse,
  TrapWard,
} from "@/game/domain/types";

export type TileEffectKind =
  | "portal"
  | "trap"
  | "hiddenTrap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "turnSkipped"
  | "trapBlocked"
  | "trapCurse"
  | "realmEnter"
  | "blessing"
  | "teleport"
  | "abilityReady"
  | "abilityUsed"
  /** A levitating player floated over a tile's effect. */
  | "levitated";

/** The last revealed roll: its dice, and how they became the distance walked. */
export interface RollView {
  dice: readonly number[];
  /** The higher die counts (Oracle Eye) instead of their sum. */
  best: boolean;
  bonus: number;
  total: number;
}

/** A card coming off the deck: shown face down, flipped in the middle of the screen, then dealt to the hand. */
export interface CardDrawView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
}

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
  /** What a cursed trap took (trapCurse only). */
  curse?: { kind: TrapCurse; card: CardInstance | null; energyLost: number };
  /** The realm being entered (realmEnter only). */
  realm?: RealmKind;
  /** What a celestial tile gave (blessing only). */
  blessing?: { kind: Blessing; energyGained: number };
  /** What kept the trap off, and whether it was a hidden one (trapBlocked only). */
  ward?: { kind: TrapWard; hidden: boolean };
  /** The ability that got charged or was just used (abilityReady / abilityUsed only). */
  ability?: { id: AbilityId; energyGained: number };
}

/** What the screen shows right now. Lags behind the authoritative state while animating. */
export interface MatchView {
  players: readonly Player[];
  activePlayerId: PlayerId;
  movingPlayerId: PlayerId | null;
  /** Last revealed roll; null before the first. */
  lastRoll: RollView | null;
  isRolling: boolean;
  /**
   * The throw in progress or last thrown, known from the moment it starts so the 3D die can
   * land on it. `id` changes on every throw. The HUD keeps using `lastRoll`, revealed later.
   */
  roll: { id: number; dice: readonly number[] } | null;
  /** Player charged with energy (rolled a 6 or hit an advance tile) until their move ends. */
  poweredPlayerId: PlayerId | null;
  effect: TileEffectView | null;
  winnerId: PlayerId | null;
  cast: CardCastView | null;
  /** Card being revealed after a draw. */
  drawing: CardDrawView | null;
  /** Card drawn most recently, to highlight it in the hand. */
  lastDrawnUid: string | null;
  /** Hand overflowed: waiting for this player to discard one of these. */
  pendingDiscard: { playerId: PlayerId; drawn: CardInstance } | null;
  cardsPlayedThisTurn: number;
  /** Ability the active player used this turn, still in effect. */
  abilityInUse: AbilityId | null;
  /** A trap or curse waiting on this player's choice to spend their Trap Ward. */
  pendingWard: { playerId: PlayerId; tile: TileId; threat: Threat } | null;
  /** Tiles whose trap the Trap Ward smashed for good: drawn as rubble. */
  destroyedTraps: readonly TileId[];
  isAnimating: boolean;
  /** A refused move, shown briefly; `id` changes with every refusal so repeats show again. */
  error: { id: number; message: string } | null;
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
    cast: null,
    drawing: null,
    lastDrawnUid: null,
    pendingDiscard: state.pendingDiscard,
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    abilityInUse: state.abilityInUse,
    pendingWard: state.pendingWard,
    destroyedTraps: state.destroyedTraps,
    isAnimating: false,
    error: null,
  };
}

export function canRoll(view: MatchView): boolean {
  return !view.isAnimating && view.winnerId === null && view.pendingDiscard === null && view.pendingWard === null;
}

export function activePlayerOf(view: MatchView): Player | undefined {
  return view.players.find((player) => player.id === view.activePlayerId);
}

/** Cards the active player may still play this turn (one, or two with Double Cast). */
export function cardsLeftThisTurn(view: MatchView): number {
  return Math.max(0, cardsPerTurn(view.abilityInUse) - view.cardsPlayedThisTurn);
}

/** The active player may use their ability now. */
export function canActivateAbility(view: MatchView): boolean {
  const player = activePlayerOf(view);
  return canRoll(view) && player !== undefined && abilityBlocker(player, view.abilityInUse) === null;
}

/** The active player may play a card now (energy and card choice are checked per card). */
export function canPlayCard(view: MatchView): boolean {
  return canRoll(view) && cardsLeftThisTurn(view) > 0;
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
