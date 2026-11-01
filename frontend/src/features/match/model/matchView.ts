import { abilityBlocker, type AbilityId } from "@/game/domain/abilities/ability";
import { cardsPerTurn } from "@/game/domain/abilities/basic";
import { currentPlayer } from "@/game/domain/handlers/shared";
import type { GameEvent } from "@/game/domain/core/events";
import type { AimWard } from "@/game/domain/core/playerStatus";
import type { CardId } from "@/game/domain/cards/catalog";
import { riftsOf } from "@/game/domain/characters/zarek/void";
import type { BlackFlame, Crown, EnchantedTile, Winter, Blessing, CardInstance, GameState, Player, PlayerId, RealmKind, SealKind, SpecterKind, Tile, VoidItem, Threat, TileId, TrapCurse, TrapWard } from "@/game/domain/types";

export type TileEffectKind =
  | "portal"
  | "trap"
  | "hiddenTrap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "turnSkipped"
  /** Zarek's Void at work: shown over Zarek. */
  | "voidSwallowed"
  | "riftOpened"
  | "voidCast"
  | "voidSeized"
  | "voidEchoed"
  /** A lost turn in the fairy's snow: `count` energy went to her. */
  | "snowDrained"
  | "trapBlocked"
  | "trapCurse"
  | "realmEnter"
  | "blessing"
  | "teleport"
  | "abilityReady"
  | "abilityUsed"
  | "levitated"
  | "gamble"
  | "seal"
  | "enchanted"
  | "flames"
  /** Shown over the Crystal Fairy. */
  | "winter"
  | "armour"
  | "cleansed"
  /** Shown over the one sent flying. */
  | "trampled"
  /** Kage Rubra's Susanoo threw someone back; shown over the one thrown. */
  | "repelled"
  | "timeBent"
  | "specter"
  /** Seraphiel set foot in hell. */
  | "fallen"
  | "crown"
  /** The Fallen Angel on a celestial portal: heaven stays shut and its chains hold him. */
  | "heavenBarred"
  | "dragged"
  /** Shown over whoever aimed it. */
  | "abilityBlocked"
  /** Themis's Silent Verdict, shown over the one judged. */
  | "verdict"
  /** Themis's Blind Scale took a hidden trap apart. */
  | "disarmed"
  /** Themis's Scales of Justice split two players' energy; shown over the one weighed against her. */
  | "weighed";

export interface LogEntry {
  id: number;
  event: GameEvent;
}

/** The last revealed roll. */
export interface RollView {
  dice: readonly number[];
  /** Oracle Eye: the higher die counts instead of the sum. */
  best: boolean;
  bonus: number;
  /** Applied after the bonus (Dormant Fury: 3). */
  multiplier: number;
  total: number;
}

// Every animation below carries an `id` that changes with each one, so the scene and audio replay it once.

/** Dormant Fury's lightning dash; kept after arrival so the bolt can fade. */
interface DashView {
  id: number;
  playerId: PlayerId;
  /** The start tile, then every tile crossed. */
  path: readonly TileId[];
  arrived: boolean;
}

/** A card shown face down, flipped in the middle of the screen, then dealt to the hand. */
export interface CardDrawView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
  /** Name of the player it was taken from (Card Gamble), rather than drawn off the deck. */
  takenFrom?: string;
}

/** A Cleansing Tide wave rolling over `path` (the player's tile first). */
interface TideView {
  id: number;
  playerId: PlayerId;
  path: readonly TileId[];
  /** The camera watches it until what it washed away is gone. */
  rolling: boolean;
}

interface VolleyView {
  id: number;
  playerId: PlayerId;
  from: TileId;
  targets: readonly TileId[];
  /** The rain has landed: the camera goes back to the archer while the arrows fade. */
  settled?: boolean;
}

/**
 * The Berserker steps ahead of `victim`, shoves (`shove`), they fly back (`flying`), then he turns to
 * run on (`over`, until he moves again).
 */
interface TrampleView {
  id: number;
  by: PlayerId;
  victim: PlayerId;
  tile: TileId;
  /** `rise`: the victim was seated and gets up before the shove. */
  phase: "rise" | "shove" | "flying" | "over";
  /** A Susanoo throwing them back: only the flight, `by` stays put. */
  susanoo?: boolean;
}

/** Silent Verdict: a giant scale over the two of them `weigh`s, then `tip`s down on the attacker's side. */
export interface VerdictView {
  id: number;
  judgeId: PlayerId;
  attackerId: PlayerId;
  phase: "weigh" | "tip";
}

/** Hell's Drag: a hand rises on `from` and closes on the target (`grab`), sinks with them, and they're in hell. */
export interface DragView {
  id: number;
  playerId: PlayerId;
  targetId: PlayerId;
  from: TileId;
  phase: "grab" | "sink" | "over";
}

/** Zarek's Void surfacing as a rift on a tile to swallow, open, set down or take something. */
export interface VoidRiftView {
  id: number;
  playerId: PlayerId;
  tile: TileId;
  action: "swallow" | "open" | "cast" | "seize";
}

/** Snow streaming from the Crystal Fairy's wand to a tile she's enchanting. */
interface FrostStreamView {
  id: number;
  playerId: PlayerId;
  tile: TileId;
}

export interface CardTransmuteView {
  id: number;
  playerId: PlayerId;
  from: CardInstance;
  /** The second card sacrificed with `from`. */
  sacrificed: CardInstance;
  to: CardInstance;
}

export interface CardCastView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
  targetId: PlayerId | null;
  value: number | null;
}

/** Three copies fusing into one in the middle of the screen. */
interface CardFusionView {
  id: number;
  playerId: PlayerId;
  card: CardInstance;
}

/**
 * One-shot animations in flight, each null when none plays. Kept apart from the board state because
 * they only exist on screen: the final sync never touches them.
 */
export interface MatchFx {
  cast: CardCastView | null;
  drawing: CardDrawView | null;
  fusing: CardFusionView | null;
  transmuting: CardTransmuteView | null;
  dash: DashView | null;
  volley: VolleyView | null;
  tide: TideView | null;
  /** Null once the Berserker runs on. */
  trample: TrampleView | null;
  drag: DragView | null;
  /** The camera follows it to each tile. */
  frostStream: FrostStreamView | null;
  voidRift: VoidRiftView | null;
  verdict: VerdictView | null;
}

const NO_FX: MatchFx = {
  cast: null,
  drawing: null,
  fusing: null,
  transmuting: null,
  dash: null,
  volley: null,
  tide: null,
  trample: null,
  drag: null,
  frostStream: null,
  voidRift: null,
  verdict: null,
};

/** A tile effect or turn notice; without travel, `from` and `to` are the same tile. */
export interface TileEffectView {
  kind: TileEffectKind;
  playerId: PlayerId;
  from: TileId;
  to: TileId;
  curse?: { kind: TrapCurse; card: CardInstance | null; energyLost: number };
  /** `fortune`: thrown for cards. */
  gamble?: { value: number; won: boolean; fortune?: boolean };
  /** The ability or card turned away, by what, and the opponent it was aimed at. */
  blocked?: {
    ability?: AbilityId;
    cardId?: CardId;
    ward: AimWard | "away";
    targetName: string;
  };
  realm?: RealmKind;
  blessing?: {
    kind: Blessing;
    energyGained: number;
    charged?: boolean;
    turns?: number;
  };
  ward?: { kind: TrapWard; hidden: boolean };
  ability?: { id: AbilityId };
  /** Tiles Cleansing Tide washed, tiles a trample knocked back, or Time Warp's rounds. */
  count?: number;
  crown?: Crown;
  time?: "halt" | "reverse";
  enchanted?: { owner: PlayerId; frozen: number };
  flames?: { energyLost: number };
  seal?: { kind: SealKind; owner: PlayerId; energyLost: number; energyGained: number };
  /** `kind` null: the Warden's apparitions were dispelled. */
  specter?: {
    kind: SpecterKind | null;
    owner: PlayerId;
    energyTaken: number;
    energyGained: number;
    chargeGained: number;
  };
  /** What the Void swallowed, opened, set down or took; `doubled` for a rift. */
  void?: { item: VoidItem | null; doubled?: boolean };
  /** The judge, and what the one judged had aimed at her. */
  verdict?: { judgeName: string; cardId?: CardId; ability?: AbilityId };
  /** Energy Themis's Blind Scale gained. */
  energyGained?: number;
}

/** A Shadow Warden's apparition; only its owner is shown its `kind`, others see the Warden himself. */
interface SpecterView {
  tile: TileId;
  owner: PlayerId;
  kind: SpecterKind;
}

/** A closed scroll for everyone; only its owner is shown its `kind`. */
interface SealView {
  tile: TileId;
  owner: PlayerId;
  kind: SealKind;
}

/** What the screen shows right now. Lags behind the authoritative state while animating. */
export interface MatchView {
  players: readonly Player[];
  activePlayerId: PlayerId;
  movingPlayerId: PlayerId | null;
  /** Null before the first roll. */
  lastRoll: RollView | null;
  isRolling: boolean;
  /** Known from the start of the throw so the 3D die lands on it; the HUD waits for `lastRoll`. */
  roll: { id: number; dice: readonly number[] } | null;
  /** Rolled a 6 or hit an advance tile: charged until their move ends. */
  poweredPlayerId: PlayerId | null;
  effect: TileEffectView | null;
  winnerId: PlayerId | null;
  fx: MatchFx;
  /** To highlight it in the hand. */
  lastDrawnUid: string | null;
  /** Hand overflowed: waiting for this player to discard. */
  pendingDiscard: { playerId: PlayerId; drawn: CardInstance } | null;
  cardsPlayedThisTurn: number;
  /** Used this turn and still in effect. */
  abilityInUse: AbilityId | null;
  /** Waiting on Zarek's choice to let his Void swallow the harm. */
  pendingWard: { playerId: PlayerId; tile: TileId; threat: Threat } | null;
  /** Seraphiel picking a blessing or a relic on a heaven tile. */
  pendingGrace: {
    playerId: PlayerId;
    tile: TileId;
    offer: "blessing" | "relic";
  } | null;
  /** Smashed for good or swallowed by the Void: drawn as rubble. */
  destroyedTraps: readonly TileId[];
  /** Pinned by Arrow Rain until walked past: drawn with arrows stuck in them. */
  pinnedTraps: readonly TileId[];
  seals: readonly SealView[];
  specters: readonly SpecterView[];
  enchantedTiles: readonly EnchantedTile[];
  blackFlames: readonly BlackFlame[];
  winter: Winter | null;
  /** Tiles Zarek's Void opened into the path, in the order they opened (see linkRift). */
  rifts: readonly Tile[];
  /** A Warden picking the cards their Plunder apparition takes from `victim`. */
  pendingPlunder: { owner: PlayerId; victim: PlayerId } | null;
  /** The tile a walk ends on: the figure slows to a stop on its way there. */
  walkEnd: { playerId: PlayerId; tile: TileId } | null;
  /** The battle log: events as their animation starts, the latest last (see logStep). */
  log: readonly LogEntry[];
  isAnimating: boolean;
  /** A refused move, shown briefly; the id lets a repeated refusal show again. */
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
    fx: NO_FX,
    lastDrawnUid: null,
    pendingDiscard: state.pendingDiscard,
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    abilityInUse: state.abilityInUse,
    pendingWard: state.pendingWard,
    pendingGrace: state.pendingGrace,
    destroyedTraps: state.destroyedTraps,
    pinnedTraps: state.pinnedTraps,
    seals: sealViews(state),
    specters: specterViews(state),
    enchantedTiles: state.enchantedTiles,
    blackFlames: state.blackFlames,
    winter: state.winter,
    rifts: riftsOf(state.board),
    pendingPlunder: state.pendingPlunder,
    walkEnd: null,
    log: [],
    isAnimating: false,
    error: null,
  };
}

export function sealViews(state: GameState): SealView[] {
  return state.seals.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}

export function specterViews(state: GameState): SpecterView[] {
  return state.specters.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}

export function canRoll(view: MatchView): boolean {
  return (
    !view.isAnimating &&
    view.winnerId === null &&
    view.pendingDiscard === null &&
    view.pendingWard === null &&
    view.pendingGrace === null &&
    view.pendingPlunder === null
  );
}

export function activePlayerOf(view: MatchView): Player | undefined {
  return view.players.find((player) => player.id === view.activePlayerId);
}

/** One, or two with Double Cast. */
export function cardsLeftThisTurn(view: MatchView): number {
  return Math.max(0, cardsPerTurn(view.abilityInUse) - view.cardsPlayedThisTurn);
}

export function canActivateAbility(view: MatchView): boolean {
  const player = activePlayerOf(view);
  return canRoll(view) && player !== undefined && abilityBlocker(player) === null;
}

/** Energy and card choice are checked per card. */
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

export function withFx(view: MatchView, patch: Partial<MatchFx>): MatchView {
  return { ...view, fx: { ...view.fx, ...patch } };
}

/** The id for the next animation of a kind (see MatchFx). */
export function nextFxId(current: { id: number } | null): number {
  return (current?.id ?? 0) + 1;
}
