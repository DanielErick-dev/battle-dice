import type { Blessing, RealmKind, Threat, TileId, TrapCurse, TrapWard } from "./types";
import type { CardInstance, PlayerId } from "../core/state";

/** What the tiles did: portals, realms, blessings, traps and curses. */
export type BoardEvent =
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Carried from the portal onto the track's first tile. */
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
      /** False when the ability was already full. */
      charged?: boolean;
    }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** `card` is null with an empty hand. */
  | {
      type: "trapCursed";
      playerId: PlayerId;
      curse: TrapCurse;
      card: CardInstance | null;
      energyLost: number;
    }
  /** A trap, curse or (Untamed) lost-turn tile missed the player; a `hidden` trap then moves. */
  | {
      type: "trapBlocked";
      playerId: PlayerId;
      tile: TileId;
      ward: TrapWard;
      hidden: boolean;
    }
  /** A trap on `tile` smashed for good (Plasma Cannon). */
  | { type: "trapDestroyed"; playerId: PlayerId; tile: TileId; hidden: boolean }
  /** Vinicius stopped on a trap and hoed it out for good (characters/vinicius/). */
  | { type: "trapWeeded"; playerId: PlayerId; tile: TileId; hidden: boolean }
  /** A walk freed a pinned trap (a hidden one moves elsewhere, unseen). */
  | { type: "trapUnpinned"; tile: TileId }
  /** It then moves elsewhere in its zone. */
  | { type: "hiddenTrapSprung"; playerId: PlayerId; tile: TileId; to: TileId }
  /** Hidden traps stay unseen. */
  | { type: "levitatedOver"; playerId: PlayerId; tile: TileId }
  | { type: "wardOffered"; playerId: PlayerId; tile: TileId; threat: Threat };
