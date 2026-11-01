import type { PlayerId, TileId } from "@/game/domain/types";

/** `reach` starts at the player's tile; `tiles` are those that lost a spell. */
export type AuricEvent = {
  type: "boardCleansed";
  playerId: PlayerId;
  reach: readonly TileId[];
  tiles: readonly TileId[];
};
