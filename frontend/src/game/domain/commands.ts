import type { AbilityPower } from "./abilities";
import type { CardId } from "./cards";
import type { PlayerId, TileId, TimedBlessing } from "./types";

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
  /** See fusion.ts. */
  | { type: "fuseCards"; playerId: PlayerId; cardId: CardId }
  /** Reactive abilities answer a ward prompt instead; the optional fields are each ability's choice. */
  | {
      type: "activateAbility";
      playerId: PlayerId;
      /** Hand cards (Transmutation) or discard pile cards (Resurrection). */
      cardUids?: readonly string[];
      /** In SEAL_KINDS order. */
      sealTiles?: readonly TileId[];
      /** In SPECTER_KINDS order. */
      specterTiles?: readonly TileId[];
      /** Card Gamble (random when absent), Time Warp and Hell's Drag. */
      targetId?: PlayerId;
      /** Arrow Rain; traps by default. */
      volley?: "opponents" | "traps";
      /** Ocular Awakening, Time Warp and Card Gamble's pick. */
      power?: AbilityPower;
      flameTiles?: readonly TileId[];
      /** Crystal Fairy once Eternal Winter has begun. */
      frostTiles?: readonly TileId[];
      /** Zarek's Void, idle long enough: the tile whose spell it takes over. */
      seizeTile?: TileId;
    }
  /** Zarek sets down the Void's `index`th item: a harm opens a rift right after `tile`, a spell lands on it. */
  | { type: "placeVoid"; playerId: PlayerId; index: number; tile: TileId; doubled?: boolean }
  | { type: "plunderCards"; playerId: PlayerId; cardUids: readonly string[] }
  | { type: "answerWard"; playerId: PlayerId; use: boolean }
  /** A `blessing` on a blessing tile, a divine `cardId` on a relic. */
  | {
      type: "chooseGrace";
      playerId: PlayerId;
      blessing?: TimedBlessing;
      cardId?: CardId;
    }
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
  | "NO_HELL"
  | "WARD_PENDING"
  | "NO_WARD_PENDING"
  | "NO_ABILITY"
  | "CANNOT_FUSE"
  | "ABILITY_REACTIVE"
  | "ABILITY_NOT_READY"
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
  | "INVALID_FROST"
  | "PLUNDER_PENDING"
  | "NO_PLUNDER_PENDING"
  | "GRACE_PENDING"
  | "NO_GRACE_PENDING"
  | "INVALID_GRACE"
  | "VOID_FULL"
  | "INVALID_VOID";

export class GameRuleError extends Error {
  constructor(readonly code: GameErrorCode) {
    super(code);
    this.name = "GameRuleError";
  }
}
