import type { PlayerId, TileId } from "@/game/domain/types";

/** A harmful tile the Crystal Fairy enchanted for good. */
export interface EnchantedTile {
  tile: TileId;
  owner: PlayerId;
}

/** The Crystal Fairy's Eternal Winter: the path freezes from the start, WINTER_TILES more every round. */
export interface Winter {
  owner: PlayerId;
  /** Last tile frozen so far (the start when none yet). */
  frontier: TileId;
  /** Frozen beyond the frontier by the fairy's own hand (WINTER_PICKS at a time). */
  iced: readonly TileId[];
  /** Ice she laid in hell, and the rounds the fire has been melting it (see HELL_ICE_ROUNDS). */
  melting?: readonly MeltingIce[];
}

export interface MeltingIce {
  tile: TileId;
  rounds: number;
}

export type FairyEvent =
  /** A lost turn in `owner`'s snow drained `energy` from the player into the fairy. */
  | { type: "snowDrained"; playerId: PlayerId; owner: PlayerId; energy: number }
  /** A hidden trap among `tiles` is gone too. */
  | { type: "tilesEnchanted"; playerId: PlayerId; tiles: readonly TileId[] }
  /** The owner is carried ahead (a playerMoved follows); an opponent is snowed in for `frozen` rounds. */
  | {
      type: "enchantmentStirred";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      frozen: number;
      charged: boolean;
    }
  /** No harm was left ahead to snow. */
  | { type: "winterBegan"; playerId: PlayerId }
  | { type: "winterSpread"; owner: PlayerId; from: TileId; to: TileId }
  | { type: "tilesFrozen"; playerId: PlayerId; tiles: TileId[] };
