import type { PlayerId, TileId } from "./types";

/**
 * Everything that happened while resolving a command, in order.
 * The UI replays these to animate; a future server broadcasts them to the room.
 */
export type GameEvent =
  | { type: "diceRolled"; playerId: PlayerId; value: number }
  | { type: "playerMoved"; playerId: PlayerId; path: readonly TileId[] }
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "extraTurnGranted"; playerId: PlayerId; tile: TileId }
  | { type: "skipTurnGained"; playerId: PlayerId; tile: TileId }
  | { type: "turnSkipped"; playerId: PlayerId }
  | { type: "playerWon"; playerId: PlayerId }
  | { type: "turnChanged"; playerId: PlayerId }
  | { type: "gameRestarted" };
