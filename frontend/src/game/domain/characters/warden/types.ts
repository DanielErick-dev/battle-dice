import type { PlayerId, TileId } from "@/game/domain/types";

/** The Shadow Warden's apparitions. */
export type SpecterKind = "plunder" | "hunger";

/** Strikes whoever else walks through its tile. */
export interface Specter {
  tile: TileId;
  kind: SpecterKind;
  owner: PlayerId;
}

/** `owner` picks which of `victim`'s cards their Plunder specter takes. */
export interface PendingPlunder {
  owner: PlayerId;
  victim: PlayerId;
  /** Caught during a roll, so the turn ends once the cards are picked. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

export type WardenEvent =
  /** `tiles` in SPECTER_KINDS order. */
  | { type: "spectersSummoned"; playerId: PlayerId; tiles: readonly TileId[] }
  /** Hunger moves `energyTaken` to the owner (the rest charging them); Plunder follows with plunderOffered. */
  | {
      type: "specterStruck";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      kind: SpecterKind;
      energyTaken: number;
      energyGained: number;
      chargeGained: number;
    }
  /** Walking through the Warden themselves fades their apparitions. */
  | { type: "spectersDispelled"; playerId: PlayerId; owner: PlayerId; tiles: readonly TileId[] }
  | { type: "plunderOffered"; owner: PlayerId; victim: PlayerId };
