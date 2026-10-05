import { abilityBlocker, cardsPerTurn, type AbilityId } from "@/game/domain/abilities";
import { currentPlayer } from "@/game/domain/engine";
import type {
  BlackFlame,
  EnchantedTile,
  Blessing,
  CardInstance,
  GameState,
  Player,
  PlayerId,
  RealmKind,
  SealKind,
  SpecterKind,
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
  | "levitated"
  /** Card Gamble's die of fortune came up. */
  | "gamble"
  /** A forbidden seal broke under a player. */
  | "seal"
  /** An enchanted tile stirred under a player (see enchanted). */
  | "enchanted"
  /** A player went through black fire. */
  | "flames"
  /** Spectral Armour turned something away from a player. */
  | "armour"
  /** Cleansing Tide washed the spells off the board. */
  | "cleansed"
  /** Glacial Howl froze the opponents in reach. */
  | "frozen"
  /** Time Warp halted or reversed a player's time (shown over them). */
  | "timeBent"
  /** A player walked through a Shadow Warden's apparition, or through the Warden, dispelling them. */
  | "specter";

/** The last revealed roll: its dice, and how they became the distance walked. */
export interface RollView {
  dice: readonly number[];
  /** The higher die counts (Oracle Eye) instead of their sum. */
  best: boolean;
  bonus: number;
  /** The total was multiplied by this (Dormant Fury: 3), after the bonus; 1 otherwise. */
  multiplier: number;
  total: number;
}

/**
 * A move crossed as a bolt of lightning (Dormant Fury): kept after the dash so its lightning can
 * fade; `id` changes with each dash.
 */
export interface DashView {
  id: number;
  playerId: PlayerId;
  /** Where the dash starts, then every tile it crosses. */
  path: readonly TileId[];
  /** The player stepped out of the lightning at the end of the path. */
  arrived: boolean;
}

/** A card coming off the deck: shown face down, flipped in the middle of the screen, then dealt to the hand. */
export interface CardDrawView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
  /** Taken from another player's hand (their name), rather than drawn off the deck. */
  takenFrom?: string;
}

/** A hand card turning into another (Transmutation); `id` changes on every one. */
/** An Arrow Rain volley: shot up from `from`, falling on `targets`. `id` changes with every volley. */
export interface VolleyView {
  id: number;
  playerId: PlayerId;
  from: TileId;
  targets: readonly TileId[];
}

export interface CardTransmuteView {
  id: number;
  playerId: PlayerId;
  from: CardInstance;
  /** The second card sacrificed with `from`. */
  sacrificed: CardInstance;
  to: CardInstance;
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
  /** What Card Gamble's die came up, and whether that wins (gamble only). */
  gamble?: { value: number; won: boolean };
  /** The realm being entered (realmEnter only). */
  realm?: RealmKind;
  /** What a celestial tile gave (blessing only). */
  blessing?: { kind: Blessing; energyGained: number };
  /** What kept the trap off, and whether it was a hidden one (trapBlocked only). */
  ward?: { kind: TrapWard; hidden: boolean };
  /** The ability that got charged or was just used (abilityReady / abilityUsed only). */
  ability?: { id: AbilityId };
  /** How many tiles Cleansing Tide washed (cleansed), or how many opponents Glacial Howl froze (frozen). */
  count?: number;
  /** How Time Warp bent the player's time (timeBent; `count` is the rounds). */
  time?: "halt" | "reverse";
  /** Whose enchanted tile it was and the energy it moved (enchanted only). */
  enchanted?: { owner: PlayerId; frozen: number };
  /** Energy the black fire took (flames only). */
  flames?: { energyLost: number };
  /** Which seal broke, whose it was and the energy it moved (seal only). */
  seal?: { kind: SealKind; owner: PlayerId; energyLost: number; energyGained: number };
  /** Which apparition struck (null: the Warden's apparitions were dispelled) and what it took (specter only). */
  specter?: {
    kind: SpecterKind | null;
    owner: PlayerId;
    energyTaken: number;
    energyGained: number;
    chargeGained: number;
  };
}

/**
 * A Shadow Warden's apparition on the board. Only its owner is shown its `kind`: to everyone
 * else, both look exactly like the Warden (see BoardScene's viewer).
 */
export interface SpecterView {
  tile: TileId;
  owner: PlayerId;
  kind: SpecterKind;
}

/** A seal on the board: a closed scroll for everyone; only its owner is shown its `kind`. */
export interface SealView {
  tile: TileId;
  owner: PlayerId;
  kind: SealKind;
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
  /** The last lightning dash (Dormant Fury). */
  dash: DashView | null;
  /** The last Arrow Rain volley. */
  volley: VolleyView | null;
  /** Card being transmuted, shown in the middle of the screen as it changes. */
  transmuting: CardTransmuteView | null;
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
  /** Tiles whose threat Arrow Rain pinned down, until walked past: drawn with arrows stuck in them. */
  pinnedTraps: readonly TileId[];
  /** Forbidden seals written on the board, not broken yet. */
  seals: readonly SealView[];
  /** Shadow Warden apparitions on the board. */
  specters: readonly SpecterView[];
  /** Tiles the Crystal Fairy enchanted for good. */
  enchantedTiles: readonly EnchantedTile[];
  /** Tiles on the Purgatory Kunoichi's black fire. */
  blackFlames: readonly BlackFlame[];
  /** A Warden picking the cards their Plunder apparition takes from `victim`. */
  pendingPlunder: { owner: PlayerId; victim: PlayerId } | null;
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
    dash: null,
    volley: null,
    transmuting: null,
    lastDrawnUid: null,
    pendingDiscard: state.pendingDiscard,
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    abilityInUse: state.abilityInUse,
    pendingWard: state.pendingWard,
    destroyedTraps: state.destroyedTraps,
    pinnedTraps: state.pinnedTraps,
    seals: sealViews(state),
    specters: specterViews(state),
    enchantedTiles: state.enchantedTiles,
    blackFlames: state.blackFlames,
    pendingPlunder: state.pendingPlunder,
    isAnimating: false,
    error: null,
  };
}

/** The seals on the board (their kinds are for their owners' eyes only, see SealView). */
export function sealViews(state: GameState): SealView[] {
  return state.seals.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}

/** The apparitions on the board (their kinds are for their owners' eyes only, see SpecterView). */
export function specterViews(state: GameState): SpecterView[] {
  return state.specters.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}

export function canRoll(view: MatchView): boolean {
  return (
    !view.isAnimating &&
    view.winnerId === null &&
    view.pendingDiscard === null &&
    view.pendingWard === null &&
    view.pendingPlunder === null
  );
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
