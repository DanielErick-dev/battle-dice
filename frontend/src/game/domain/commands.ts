import type { PlayerId } from "./types";

export type GameCommand =
  | { type: "rollDice"; playerId: PlayerId }
  /** `targetId` for cards aimed at an opponent, `value` for cards that pick a die face. */
  | { type: "playCard"; playerId: PlayerId; cardUid: string; targetId?: PlayerId; value?: number }
  | { type: "discardCard"; playerId: PlayerId; cardUid: string }
  | { type: "restart" };

export type GameErrorCode =
  | "NOT_YOUR_TURN"
  | "GAME_FINISHED"
  | "UNKNOWN_PLAYER"
  | "DISCARD_PENDING"
  | "NO_DISCARD_PENDING"
  | "UNKNOWN_CARD"
  | "CARD_ALREADY_PLAYED"
  | "NOT_ENOUGH_KI"
  | "INVALID_TARGET"
  | "INVALID_VALUE"
  | "NO_PORTAL_AHEAD";

export class GameRuleError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
    this.name = "GameRuleError";
  }
}
