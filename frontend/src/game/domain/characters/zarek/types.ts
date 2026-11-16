import type { Tile, TileId, TrapCurse } from "../../board/types";
import type { SealKind } from "../scribe/types";
import type { SpecterKind } from "../warden/types";
import type { Hidden } from "../../core/hidden";
import type { PlayerId } from "../../core/ids";

/** What Zarek's Void holds: a board harm swallowed whole, or another's spell taken over. */
export type VoidItem =
  | { kind: "trap"; back: number; curse?: TrapCurse }
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "skipTurn" }
  | { kind: "flame" }
  | { kind: "snow" }
  /** HIDDEN to everyone but Zarek in a projected state, like the seal itself. */
  | { kind: "seal"; seal: SealKind | Hidden }
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

/** Zarek's own state on his Player; everyone else keeps NO_ZAREK. */
export interface ZarekState {
  /** The Void: what it swallowed or took, waiting to be set down. */
  hold: readonly VoidItem[];
  /** Own turns ended since the Void last swallowed or took something. */
  idle: number;
}

export const NO_ZAREK: ZarekState = { hold: [], idle: 0 };

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
  | { type: "voidFed"; playerId: PlayerId; charge: number }
  /** The Void Apex swallowed `victims` (the protected stay out) for APEX_TURNS of their turns. */
  | { type: "voidApex"; playerId: PlayerId; victims: readonly PlayerId[] }
  /** `victimId` rolled `value` from inside the Void: Zarek walked `path` with it. */
  | { type: "voidRollTaken"; playerId: PlayerId; victimId: PlayerId; value: number; path: readonly TileId[] }
  | { type: "voidReleased"; playerId: PlayerId };
