import type { PlayerId, SealKind, SpecterKind, Tile, TileId, TrapCurse } from "@/game/domain/types";

/** What Zarek's Void holds: a board harm swallowed whole, or another's spell taken over. */
export type VoidItem =
  | { kind: "trap"; back: number; curse?: TrapCurse }
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "skipTurn" }
  | { kind: "flame" }
  | { kind: "snow" }
  | { kind: "seal"; seal: SealKind }
  | { kind: "specter"; specter: SpecterKind };
export type VoidHarm = Extract<VoidItem, { kind: "trap" | "curse" | "skipTurn" }>;
export type VoidSpell = Exclude<VoidItem, VoidHarm>;

/** A tile marked by the Void: the harm strikes everyone but its owner (left where a spell was taken, or set in hell). */
export interface VoidScar {
  tile: TileId;
  owner: PlayerId;
  harm: VoidHarm;
  doubled: boolean;
}

export type ZarekEvent =
  /** Zarek's Void took the harm on `tile` in (a `hidden` trap leaves the board): the tile is harmless for good. */
  | { type: "voidSwallowed"; playerId: PlayerId; tile: TileId; item: VoidItem; hidden: boolean }
  /** A harm from the Void opened `rift`, a new tile in the path (see linkRift). */
  | { type: "riftOpened"; playerId: PlayerId; rift: Tile }
  /** A spell from the Void set down on `tile`, now Zarek's own. */
  | { type: "voidCast"; playerId: PlayerId; tile: TileId; item: VoidItem }
  /** The idle Void took over the spell on `tile`. */
  | { type: "voidSeized"; playerId: PlayerId; tile: TileId; item: VoidItem }
  /** The Void Echo: the last thing in the Void, now twice. */
  | { type: "voidEchoed"; playerId: PlayerId; item: VoidItem }
  /** Traps sprung, smashed or pinned charged the Void. */
  | { type: "voidFed"; playerId: PlayerId; charge: number };
