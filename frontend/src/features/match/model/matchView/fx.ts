import type { CardInstance, PlayerId, TileId } from "@/game/domain/types";
import type { MatchView } from "./view";

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
 * Bjorn steps ahead of `victim`, shoves (`shove`), they fly back (`flying`), then he turns to
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

/** One of Akane's fires going off: a fireball thrown, a ring bursting out, a pillar, or the Supernova. */
export interface BlazeView {
  id: number;
  kind: "bolt" | "burst" | "pillar" | "nova" | "lob" | "fume";
  playerId: PlayerId;
  /** Hit by fireballs from him (bolt, burst). */
  targetIds: readonly PlayerId[];
  /** Nova: the scarlet tiles whose fire streams back into him. Lob: the tiles his fireball sets alight, in order. */
  tiles: readonly TileId[];
  /** The clip he acts it out with. */
  act?: "strike" | "fume";
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
  /** Null once Bjorn runs on. */
  trample: TrampleView | null;
  drag: DragView | null;
  /** The camera follows it to each tile. */
  frostStream: FrostStreamView | null;
  voidRift: VoidRiftView | null;
  verdict: VerdictView | null;
  blaze: BlazeView | null;
  /** Blind Justice under way: the camera follows each walker in turn. */
  march: { playerId: PlayerId } | null;
}

export const NO_FX: MatchFx = {
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
  blaze: null,
  march: null,
};

export function withFx(view: MatchView, patch: Partial<MatchFx>): MatchView {
  return { ...view, fx: { ...view.fx, ...patch } };
}

/** The id for the next animation of a kind (see MatchFx). */
export function nextFxId(current: { id: number } | null): number {
  return (current?.id ?? 0) + 1;
}
