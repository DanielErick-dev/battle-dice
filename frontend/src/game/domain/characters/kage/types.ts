import type { PlayerId, TileId } from "@/game/domain/types";

/** A tile on black fire from the Purgatory Kunoichi's Eternal Flames. */
export interface BlackFlame {
  tile: TileId;
  owner: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
  /** It goes out at FLAME_HITS. */
  hits: number;
}

export type KageEvent =
  | { type: "flamesLit"; playerId: PlayerId; tiles: readonly TileId[] }
  /** A playerPushed follows. */
  | { type: "flamesScorched"; playerId: PlayerId; owner: PlayerId; tile: TileId; energyLost: number; charged: boolean }
  | { type: "flamesFaded"; owner: PlayerId; tiles: readonly TileId[] }
  /** Thrown back for stopping on her tile, or `ahead` when she stopped on theirs. */
  | { type: "susanooRepelled"; playerId: PlayerId; by: PlayerId; tile: TileId; to: TileId; ahead: boolean };
