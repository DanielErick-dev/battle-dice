import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/ids";

/** A tile on black fire from the Purgatory Kunoichi's Eternal Flames. */
export interface BlackFlame {
  tile: TileId;
  owner: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
  /** Scorches left before it goes out (FLAME_HITS when lit). */
  burnsLeft: number;
}

export type KageEvent =
  | { type: "flamesLit"; playerId: PlayerId; tiles: readonly TileId[] }
  /** A playerPushed follows. */
  | { type: "flamesScorched"; playerId: PlayerId; owner: PlayerId; tile: TileId; energyLost: number; charged: boolean }
  /** Amaterasu's Breeze: every black fire gains `turns` rounds and `burns` scorches. */
  | { type: "flamesRenewed"; playerId: PlayerId; tiles: readonly TileId[]; turns: number; burns: number }
  | { type: "flamesFaded"; owner: PlayerId; tiles: readonly TileId[] }
  /** Thrown back for stopping on her tile, or `ahead` when she stopped on theirs. */
  | { type: "susanooRepelled"; playerId: PlayerId; by: PlayerId; tile: TileId; to: TileId; ahead: boolean };
