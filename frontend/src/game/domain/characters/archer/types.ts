import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/ids";

/** Arrow Rain on opponents' tiles (each then pushed) or on the traps ahead it pins (`pinned`, `hidden` revealed). */
export type ArcherEvent = {
  type: "arrowsLoosed";
  playerId: PlayerId;
  targets: readonly TileId[];
  pinned: readonly TileId[];
  hidden: readonly TileId[];
};
