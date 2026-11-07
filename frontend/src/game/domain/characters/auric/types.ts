import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/ids";

/** `reach` starts at the player's tile; `tiles` are those that lost a spell. */
export type AuricEvent = {
  type: "boardCleansed";
  playerId: PlayerId;
  reach: readonly TileId[];
  tiles: readonly TileId[];
};
