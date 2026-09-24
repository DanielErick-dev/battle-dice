import type { PlayerId } from "./types";

export type GameCommand =
  | { type: "rollDice"; playerId: PlayerId }
  | { type: "restart" };

export type GameErrorCode = "NOT_YOUR_TURN" | "GAME_FINISHED" | "UNKNOWN_PLAYER";

export class GameRuleError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
    this.name = "GameRuleError";
  }
}
