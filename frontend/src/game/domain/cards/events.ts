import type { AimWard, CardId, CardInstance, PlayerId, TileId } from "@/game/domain/types";

/** Cards moving between deck, hand and discard pile, and being played. */
export type CardEvent =
  | { type: "cardDrawn"; playerId: PlayerId; card: CardInstance }
  | {
      type: "cardsFused";
      playerId: PlayerId;
      used: readonly string[];
      card: CardInstance;
    }
  | { type: "deckReshuffled"; playerId: PlayerId; size: number }
  /** The drawn card is among those the player can throw away. */
  | { type: "discardRequired"; playerId: PlayerId; card: CardInstance }
  | {
      type: "cardDiscarded";
      playerId: PlayerId;
      card: CardInstance;
      hand: readonly CardInstance[];
    }
  | {
      type: "cardPlayed";
      playerId: PlayerId;
      card: CardInstance;
      targetId: PlayerId | null;
      value: number | null;
    }
  /** Played and spent for nothing. */
  | {
      type: "cardBlocked";
      playerId: PlayerId;
      targetId: PlayerId;
      cardId: CardId;
      ward: AimWard;
    }
  | { type: "cardTeleported"; playerId: PlayerId; from: TileId; to: TileId }
  /** Random cards from `from`'s hand to `playerId`'s; `discarded` found the hand full. */
  | {
      type: "cardsStolen";
      playerId: PlayerId;
      from: PlayerId;
      cards: readonly CardInstance[];
      discarded: readonly CardInstance[];
    };
