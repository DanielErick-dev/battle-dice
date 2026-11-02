import type { AbilityPower } from "../abilities/ability";
import type { CardId } from "../cards/catalog";
import type { PlayerId } from "./state";
import type { TileId, TimedBlessing } from "../board/types";

export type GameCommand =
  | { type: "rollDice"; playerId: PlayerId }
  /** `targetId` for cards aimed at an opponent, `value` for cards that pick a die face. */
  | {
      type: "playCard";
      playerId: PlayerId;
      cardUid: string;
      targetId?: PlayerId;
      value?: number;
      /** Hand cards burnt to pay for a card that asks for them (see CardDefinition.sacrifices). */
      sacrificeUids?: readonly string[];
    }
  | { type: "discardCard"; playerId: PlayerId; cardUid: string }
  /** SACRIFICE_ENERGY for a card off the top of the deck, any time in the player's turn. */
  | { type: "sacrificeEnergy"; playerId: PlayerId }
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
