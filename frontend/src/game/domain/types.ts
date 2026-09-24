import type { CardId } from "./cards";

export type PlayerId = string;
export type TileId = number;

export type TileEffect =
  | { kind: "none" }
  | { kind: "portal"; to: TileId }
  | { kind: "trap"; to: TileId }
  /** Walks forward to `to`, tile by tile. */
  | { kind: "advance"; to: TileId }
  | { kind: "extraTurn" }
  | { kind: "skipTurn" }
  /** Draws a card. */
  | { kind: "card" };

export type TileRole = "start" | "finish" | "regular";

export interface Tile {
  id: TileId;
  role: TileRole;
  effect: TileEffect;
}

export interface Board {
  tiles: readonly Tile[];
  startTile: TileId;
  finishTile: TileId;
}

export interface Player {
  id: PlayerId;
  name: string;
  position: TileId;
  /** Upcoming turns this player will lose. */
  skipTurns: number;
  /** Energy spent to play cards; +1 at the start of each of the player's turns. */
  ki: number;
  hand: readonly CardInstance[];
  /** Cards still to draw, top first. Server-side secret once rooms exist. */
  deck: readonly CardInstance[];
  /** Ki Barrier up: the next trap is ignored. */
  shielded: boolean;
  /** Modifier for the player's next roll, from a card. */
  diceBoost: DiceBoost | null;
}

/** One physical copy of a card; `uid` tells apart copies of the same card in a hand. */
export interface CardInstance {
  uid: string;
  cardId: CardId;
}

export type DiceBoost = { kind: "double" } | { kind: "fixed"; value: number };

/** A drawn card that doesn't fit the hand: the player must discard one before play goes on. */
export interface PendingDiscard {
  playerId: PlayerId;
  drawn: CardInstance;
  /** Drawn during a roll, so the turn ends once the discard is chosen. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

export type GameStatus = "playing" | "finished";

export interface GameState {
  board: Board;
  players: readonly Player[];
  /** Each player's card list, kept to reshuffle on restart. */
  decks: Readonly<Record<PlayerId, readonly CardId[]>>;
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId: PlayerId | null;
  turn: number;
  /** One card per turn. */
  cardPlayedThisTurn: boolean;
  /** An extra turn earned by a card's movement, honoured when this turn ends. */
  bonusTurn: boolean;
  pendingDiscard: PendingDiscard | null;
}
