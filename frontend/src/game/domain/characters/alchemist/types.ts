import type { TileId } from "../../board/types";
import type { CardInstance, PlayerId } from "../../core/state";

/** The Alchemist's own state on her Player (see characters/alchemist/); everyone else keeps NO_ALCHEMIST. */
export interface AlchemistState {
  /** Cards sent to any graveyard since her Condenser last filled (it fills at CONDENSER_CARDS). */
  condensed: number;
  /** Extra turns banked by a lost-turn tile turned in her favour, played one after another. */
  extraTurns: number;
}

export const NO_ALCHEMIST: AlchemistState = { condensed: 0, extraTurns: 0 };

/** The Great Alchemical Inversion: while it lasts, tiles turn against her opponents and in her favour. */
export interface Inversion {
  owner: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
}

/** `owner` picks `picks` cards from a graveyard: her own (`own`, the Condenser) or anyone's (her cards). */
export interface PendingRaid {
  owner: PlayerId;
  picks: number;
  own: boolean;
  /** Raised during a roll, so the turn ends once the cards are picked. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

/** What a tile turned into: for her the opposite boon, for an opponent under the Inversion the opposite harm. */
export type InvertedOutcome =
  | "advance"
  | "pushBack"
  | "extraTurns"
  | "loseTurn"
  | "draw"
  | "discard"
  | "energy"
  | "drain"
  | "heaven"
  | "hell"
  /** A protected opponent (Untamed, Convergence) shrugs it off: the tile does nothing. */
  | "resisted";

export type AlchemistEvent =
  | { type: "inversionStarted"; playerId: PlayerId; turns: number }
  | { type: "inversionEnded"; playerId: PlayerId }
  /** `playerId` stopped on `tile` and it acted the other way round: `outcome`, by `amount` (tiles, turns, energy). */
  | { type: "tileInverted"; playerId: PlayerId; tile: TileId; outcome: InvertedOutcome; amount?: number }
  /** Her Condenser took in `count` more cards: `condensed` is where it stands now (it fills at CONDENSER_CARDS). */
  | { type: "condenserFed"; playerId: PlayerId; condensed: number }
  /** She is to pick `picks` cards from her own graveyard (`own`) or anyone's. */
  | { type: "graveyardOpened"; playerId: PlayerId; picks: number; own: boolean }
  /** The cards she took, each from whose graveyard. */
  | { type: "graveyardRaided"; playerId: PlayerId; cards: readonly { from: PlayerId; card: CardInstance }[] }
  /** The Magnum Opus: her whole hand burnt, and the best card each opponent held. */
  | {
      type: "magnumOpus";
      playerId: PlayerId;
      burnt: readonly CardInstance[];
      taken: readonly { from: PlayerId; card: CardInstance }[];
    };
