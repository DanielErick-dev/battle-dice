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
  /** `playerId`'s roll of `damage` ran into the wall on `tile` and stopped before it; `hp` is what's left. */
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
