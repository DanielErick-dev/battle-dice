import type { AbilityId } from "./abilities";
import type { Blessing, CardInstance, PlayerId, RealmKind, Threat, TileId, TrapCurse, TrapWard } from "./types";

/**
 * Everything that happened while resolving a command, in order.
 * The UI replays these to animate; a future server broadcasts them to the room.
 */
export type GameEvent =
  /**
   * `dice` holds each die thrown (two under Berserk Fury / Oracle Eye); `value` is how far the
   * player walks: their sum, or the higher one when `best`, plus any card `bonus`.
   */
  | {
      type: "diceRolled";
      playerId: PlayerId;
      value: number;
      dice: readonly number[];
      best?: boolean;
      bonus?: number;
    }
  | { type: "playerMoved"; playerId: PlayerId; path: readonly TileId[] }
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  /** A realm portal opened: the player is carried from the portal to the track's first tile. */
  | {
      type: "realmEntered";
      playerId: PlayerId;
      realm: RealmKind;
      from: TileId;
      to: TileId;
    }
  | {
      type: "blessingReceived";
      playerId: PlayerId;
      blessing: Blessing;
      tile: TileId;
      energyGained: number;
    }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** A cursed trap took a card (`card`, null with an empty hand) or energy (`energyLost`, 0 when there was none). */
  | {
      type: "trapCursed";
      playerId: PlayerId;
      curse: TrapCurse;
      card: CardInstance | null;
      energyLost: number;
    }
  | { type: "extraTurnGranted"; playerId: PlayerId; tile: TileId }
  | { type: "skipTurnGained"; playerId: PlayerId; tile: TileId }
  | { type: "turnSkipped"; playerId: PlayerId }
  /** A trap or curse on `tile` didn't touch the player; `hidden` for a hidden trap, which then moves. */
  | {
      type: "trapBlocked";
      playerId: PlayerId;
      tile: TileId;
      ward: TrapWard;
      hidden: boolean;
    }
  /** The Trap Ward smashed the trap on `tile`: it does nothing for the rest of the game. */
  | { type: "trapDestroyed"; playerId: PlayerId; tile: TileId; hidden: boolean }
  /** A hidden trap sprang on `tile`, knocking the player back to `to`; it then moves elsewhere in its zone. */
  | { type: "hiddenTrapSprung"; playerId: PlayerId; tile: TileId; to: TileId }
  /** The player's ability finished charging as their turn started. */
  | { type: "abilityReady"; playerId: PlayerId; ability: AbilityId }
  /** The player spent their ability (`energyGained` for Celestial Grace). */
  | {
      type: "abilityUsed";
      playerId: PlayerId;
      ability: AbilityId;
      energyGained: number;
    }
  /** A trap or curse is about to strike: the player chooses whether to ward it off with their ability. */
  | { type: "wardOffered"; playerId: PlayerId; tile: TileId; threat: Threat }
  | { type: "cardDrawn"; playerId: PlayerId; card: CardInstance }
  /** The deck ran out: the discard pile was shuffled into a new deck. */
  | { type: "deckReshuffled"; playerId: PlayerId; size: number }
  /** Hand was full: the player must pick a card to throw away (the drawn one included). */
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
  /** Knocked back tile by tile (Arcane Blast). */
  | {
      type: "playerPushed";
      playerId: PlayerId;
      by: PlayerId;
      path: readonly TileId[];
    }
  | { type: "cardTeleported"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "playerWon"; playerId: PlayerId }
  | { type: "turnChanged"; playerId: PlayerId }
  | { type: "gameRestarted" };
