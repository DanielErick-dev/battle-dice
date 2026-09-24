import type { CardInstance, PlayerId, TileId } from "./types";

/**
 * Everything that happened while resolving a command, in order.
 * The UI replays these to animate; a future server broadcasts them to the room.
 */
export type GameEvent =
  /** `dice` holds each die thrown (two under Kaioken); `value` is their total. */
  | { type: "diceRolled"; playerId: PlayerId; value: number; dice: readonly number[] }
  | { type: "playerMoved"; playerId: PlayerId; path: readonly TileId[] }
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "extraTurnGranted"; playerId: PlayerId; tile: TileId }
  | { type: "skipTurnGained"; playerId: PlayerId; tile: TileId }
  | { type: "turnSkipped"; playerId: PlayerId }
  | { type: "trapBlocked"; playerId: PlayerId; tile: TileId }
  | { type: "cardDrawn"; playerId: PlayerId; card: CardInstance }
  /** Hand was full: the player must pick a card to throw away (the drawn one included). */
  | { type: "discardRequired"; playerId: PlayerId; card: CardInstance }
  | { type: "cardDiscarded"; playerId: PlayerId; card: CardInstance; hand: readonly CardInstance[] }
  | { type: "cardPlayed"; playerId: PlayerId; card: CardInstance; targetId: PlayerId | null; value: number | null }
  /** Knocked back tile by tile (Kamehameha). */
  | { type: "playerPushed"; playerId: PlayerId; by: PlayerId; path: readonly TileId[] }
  | { type: "cardTeleported"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "playerWon"; playerId: PlayerId }
  | { type: "turnChanged"; playerId: PlayerId }
  | { type: "gameRestarted" };
