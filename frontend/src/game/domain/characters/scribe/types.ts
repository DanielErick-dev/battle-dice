import type { PlayerId, TileId } from "@/game/domain/types";

/** The Flesh Scribe's four forbidden seals. */
export type SealKind = "tithe" | "ruin" | "silence" | "bloodPact";

/** Only `owner` knows its `kind`; to everyone else all seals look alike. */
export interface Seal {
  tile: TileId;
  kind: SealKind;
  owner: PlayerId;
}

export type ScribeEvent =
  /** Which seal is where stays the writer's secret. */
  | { type: "sealsWritten"; playerId: PlayerId; tiles: readonly TileId[] }
  /** The Pact moves energy here; the Tithe and Ruin follow as cardsStolen and playerPushed. */
  | {
      type: "sealBroken";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      kind: SealKind;
      energyLost: number;
      energyGained: number;
    };
