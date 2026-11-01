import type { PlayerId, TileId } from "@/game/domain/types";

export type BjornEvent =
  | { type: "untamedUnleashed"; playerId: PlayerId; turns: number }
  /** Comes between the playerMoved up to `tile` and the one for the rest of the walk. */
  | {
      type: "playerTrampled";
      playerId: PlayerId;
      by: PlayerId;
      tile: TileId;
      path: readonly TileId[];
      /** Sitting out lost turns (see isSeated): they get up to be shoved. */
      seated: boolean;
    };
