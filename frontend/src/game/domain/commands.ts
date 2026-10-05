import type { AbilityPower } from "./abilities";
import type { PlayerId, TileId } from "./types";

export type GameCommand =
  | { type: "rollDice"; playerId: PlayerId }
  /** `targetId` for cards aimed at an opponent, `value` for cards that pick a die face. */
  | {
      type: "playCard";
      playerId: PlayerId;
      cardUid: string;
      targetId?: PlayerId;
      value?: number;
    }
  | { type: "discardCard"; playerId: PlayerId; cardUid: string }
  /**
   * Uses the player's charged ability (not a reactive one: those answer a ward prompt);
   * `cardUids` names the cards it works on, for the abilities that need some: a hand card
   * (Transmutation), cards from the discard pile (Resurrection). `sealTiles` names where each
   * seal goes (Forbidden Seals), in SEAL_KINDS order; `specterTiles` where each apparition
   * appears (Spectral Apparitions), in SPECTER_KINDS order.
   */
  | {
      type: "activateAbility";
      playerId: PlayerId;
      cardUids?: readonly string[];
      sealTiles?: readonly TileId[];
      specterTiles?: readonly TileId[];
      /** The opponent Card Gamble bets against (one at random when not given). */
      targetId?: PlayerId;
      /** Where Arrow Rain falls: on every opponent in reach, or (by default) on the traps ahead. */
      volley?: "opponents" | "traps";
      /** Ocular Awakening's pick: black fire on `flameTiles`, or Spectral Armour. */
      power?: AbilityPower;
      flameTiles?: readonly TileId[];
    }
  /** The Warden picks the cards their Plunder specter takes from the player it caught. */
  | { type: "plunderCards"; playerId: PlayerId; cardUids: readonly string[] }
  /** Answers the prompt to spend a reactive ability on the trap or curse about to strike. */
  | { type: "answerWard"; playerId: PlayerId; use: boolean }
  | { type: "restart" };

export type GameErrorCode =
  | "NOT_YOUR_TURN"
  | "GAME_FINISHED"
  | "UNKNOWN_PLAYER"
  | "DISCARD_PENDING"
  | "NO_DISCARD_PENDING"
  | "UNKNOWN_CARD"
  | "CARD_ALREADY_PLAYED"
  | "NOT_ENOUGH_ENERGY"
  | "ALREADY_SHIELDED"
  | "DICE_BOOST_ACTIVE"
  | "INVALID_TARGET"
  | "INVALID_VALUE"
  | "NO_PORTAL_AHEAD"
  | "WARD_PENDING"
  | "NO_WARD_PENDING"
  | "NO_ABILITY"
  | "ABILITY_REACTIVE"
  | "ABILITY_NOT_READY"
  | "ABILITY_IN_USE"
  | "ENERGY_FULL"
  | "ABILITY_ALREADY_READY"
  | "EMPTY_HAND"
  | "EMPTY_DISCARD"
  | "HAND_FULL"
  | "TOO_MANY_CARDS"
  | "INVALID_SEALS"
  | "SILENCED"
  | "INVALID_SPECTERS"
  | "INVALID_FLAMES"
  | "PLUNDER_PENDING"
  | "NO_PLUNDER_PENDING";

export class GameRuleError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
    this.name = "GameRuleError";
  }
}
