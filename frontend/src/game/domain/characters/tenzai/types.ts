import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/ids";

/** Tenzai's four bendings; each one used for the first time joins his orbit (Primordial Awakening). */
export type Element = "earth" | "water" | "fire" | "wind";

export const ELEMENTS: readonly Element[] = ["earth", "water", "fire", "wind"];

/** Tectonic Wall: nobody but its owner walks past it until the rolls that hit it add up to its hp. */
export interface StoneWall {
  tile: TileId;
  owner: PlayerId;
  hp: number;
  maxHp: number;
}

/** Current Bond: whenever `target` walks forward, `owner` is pulled `share` of the way (rounded down). */
export interface Tether {
  owner: PlayerId;
  target: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
  share: number;
}

/** Breeze Heist: hidden from everyone but its owner; steals the next opponent roll of BREEZE_THRESHOLD or more. */
export interface BreezeTrap {
  owner: PlayerId;
  /** Doubled by the Elemental Exchange: the owner walks twice the stolen roll. */
  doubled: boolean;
}

/** Tenzai's creations on the table, kept together so the rest of the rules carry them as one. */
export interface Elementals {
  walls: readonly StoneWall[];
  tethers: readonly Tether[];
  breezes: readonly BreezeTrap[];
}

export const NO_ELEMENTALS: Elementals = { walls: [], tethers: [], breezes: [] };

/** Tenzai's own state on his Player (see characters/tenzai/); everyone else keeps NO_TENZAI. */
export interface TenzaiState {
  /** The elements bent since the last Convergence, in ELEMENTS order. */
  orbit: readonly Element[];
  /** The element he bent last with his ability: never twice in a row. */
  lastElement: Element | null;
  /** Own turns left in the Convergence (untouchable like Untamed), the current one included. */
  converged: number;
  /** His die enchanted for this turn's roll (Combustion Die). */
  combustion: Combustion | null;
}

export const NO_TENZAI: TenzaiState = { orbit: [], lastElement: null, converged: 0, combustion: null };

/** His die enchanted for this turn's roll (Combustion Die): a 5 or 6 explodes. */
export interface Combustion {
  multiplier: number;
  push: number;
}

export type TenzaiEvent =
  /** He bent `element` (ability or card); `doubled` by the Elemental Exchange. */
  | { type: "elementBent"; playerId: PlayerId; element: Element; doubled?: boolean }
  /** A new element joined his orbit; `elements` is the whole orbit now. */
  | { type: "elementAttuned"; playerId: PlayerId; element: Element; elements: readonly Element[] }
  /** All four: the orbit is spent and he is untouchable for `turns`, his ability ready and `bonus` on this roll. */
  | { type: "convergenceAwakened"; playerId: PlayerId; turns: number; bonus: number }
  | { type: "wallRaised"; playerId: PlayerId; tile: TileId; hp: number }
  | { type: "wallStrengthened"; playerId: PlayerId; tile: TileId; hp: number }
  /** `playerId`'s walk spent `damage` on the wall on `tile`; `hp` is what's left (at 0 it crumbles and the walk goes on). */
  | { type: "wallHit"; playerId: PlayerId; tile: TileId; damage: number; hp: number }
  | { type: "wallCrumbled"; owner: PlayerId; tile: TileId }
  | { type: "tetherBound"; playerId: PlayerId; targetId: PlayerId; turns: number }
  /** The target walked, so the owner is pulled along `path` (its last tile does nothing). */
  | { type: "tetherPulled"; playerId: PlayerId; targetId: PlayerId; path: readonly TileId[] }
  | { type: "tetherSnapped"; playerId: PlayerId; targetId: PlayerId }
  /** Riptide Lash: he and the bound target trade places (neither tile does anything). */
  | { type: "tetherSwapped"; playerId: PlayerId; targetId: PlayerId; from: TileId; to: TileId }
  | { type: "combustionReady"; playerId: PlayerId; multiplier: number }
  /** A 5 or 6 under Combustion: the roll was multiplied, `pushed` thrown back (playerPushed follow), and he rolls again. */
  | { type: "combustionExploded"; playerId: PlayerId; tile: TileId; pushed: readonly PlayerId[] }
  /** Only its owner hears of it (see projection). */
  | { type: "breezeArmed"; playerId: PlayerId; doubled: boolean }
  /** `victimId`'s roll of `value` was stolen: they stay put and the owner walks `path` instead. */
  | { type: "breezeStolen"; playerId: PlayerId; victimId: PlayerId; value: number; path: readonly TileId[] }
  /** The victim was protected: the breeze slipped off and stays armed. */
  | { type: "breezeResisted"; playerId: PlayerId; victimId: PlayerId }
  /** The Elemental Exchange spent one of his creations. */
  | { type: "breezeFaded"; playerId: PlayerId };
