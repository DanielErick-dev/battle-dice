import type { AbilityId } from "./abilities";
import type { CardId } from "./cards";

export type PlayerId = string;
export type TileId = number;

export type TileEffect =
  | { kind: "none" }
  /** Jumps to `to`, or, with a `realm`, opens a side track through that realm that comes out at `to`. */
  | { kind: "portal"; to: TileId; realm?: RealmKind }
  /** Sends the player back to `to`; a `curse` also takes something from them. */
  | { kind: "trap"; to: TileId; curse?: TrapCurse }
  /** Walks forward to `to`, tile by tile. */
  | { kind: "advance"; to: TileId }
  | { kind: "extraTurn" }
  | { kind: "skipTurn" }
  /** Draws a card. */
  | { kind: "card" }
  /** Realm track tiles: a curse without the knock-back, or a blessing. */
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "blessing"; blessing: Blessing };

/** Side worlds a portal can open into: fire and curses, or light and blessings. */
export type RealmKind = "infernal" | "celestial";

/** What a celestial tile gives: energy, or the Arcane Shield. */
export type Blessing = "energy" | "shield";

/** What a trap takes besides the tiles: a random card from the hand, or energy. */
export type TrapCurse = "discard" | "drain";

/** What kept a trap or curse off a player: the Arcane Shield (used up) or their ability. */
export type TrapWard = "shield" | "ability";

export type TileRole = "start" | "finish" | "regular" | "track";

export interface Tile {
  id: TileId;
  role: TileRole;
  effect: TileEffect;
  /** Where walking forward leads; null on the finish. Track tiles lead on to the track's exit. */
  next: TileId | null;
  /** Where being pushed back leads; null on the start. A track's first tile leads back to its portal. */
  previous: TileId | null;
  /** Set on the tiles of a realm track. */
  track?: TrackPlacement;
}

/** A tile's place in a realm track. */
export interface TrackPlacement {
  realm: RealmKind;
  /** The portal that opens the track. */
  portal: TileId;
  /** 0-based position along the track. */
  index: number;
}

/** A side path through a realm: entered through `portal`, walked tile by tile, left at `exit`. */
export interface RealmTrack {
  realm: RealmKind;
  portal: TileId;
  exit: TileId;
  tiles: readonly TileId[];
}

/**
 * A stretch of the main path hiding traps: its tiles look plain, but `traps` of them (which
 * ones is secret, see GameState.hiddenTraps) spring when landed on, then move elsewhere in it.
 */
export interface TrapZone {
  /** Plain tiles of the stretch, the ones a hidden trap can sit on. */
  tiles: readonly TileId[];
  traps: number;
}

export interface Board {
  /** The main path (1 to finishTile) first, then every realm track's tiles. */
  tiles: readonly Tile[];
  startTile: TileId;
  finishTile: TileId;
  tracks: readonly RealmTrack[];
  trapZones: readonly TrapZone[];
}

export interface Player {
  id: PlayerId;
  name: string;
  position: TileId;
  /** Upcoming turns this player will lose. */
  skipTurns: number;
  /** Energy spent to play cards; +1 every TURNS_PER_ENERGY of the player's turns. */
  energy: number;
  /** Turns started since the last energy gain. */
  energyCharge: number;
  hand: readonly CardInstance[];
  /** Cards still to draw, top first. Server-side secret once rooms exist. */
  deck: readonly CardInstance[];
  /** Played and discarded cards; shuffled back into the deck when it runs out. */
  discard: readonly CardInstance[];
  /** Arcane Shield up: the next trap is ignored. */
  shielded: boolean;
  /** Modifier for the player's next roll, from a card. */
  diceBoost: DiceBoost | null;
  /** The character's ability; null for none. */
  ability: AbilityId | null;
  /** Turns charged towards the ability, up to its abilityCycle (ready); emptied when it's used. */
  abilityCharge: number;
}

/** One physical copy of a card; `uid` tells apart copies of the same card in a hand. */
export interface CardInstance {
  uid: string;
  cardId: CardId;
}

export type DiceBoost =
  /** Two dice, added up (Berserk Fury). */
  | { kind: "double" }
  /** Two dice, the higher one counts (Oracle Eye). */
  | { kind: "best" }
  /** A chosen value instead of a throw (Fate Rune). */
  | { kind: "fixed"; value: number }
  /** `amount` added to each of the next `rolls` rolls (Lucky Charm, Ancestral Awakening). */
  | { kind: "bonus"; amount: number; rolls: number };

/** What's about to strike a player who could ward it off with their ability. */
export type Threat = "trap" | "hiddenTrap" | "curse";

/** A trap or curse is waiting on the player's choice to spend their reactive ability on it. */
export interface PendingWard {
  playerId: PlayerId;
  tile: TileId;
  threat: Threat;
  /** Struck during a roll, so the turn ends once it's answered. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

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
  /** One card per turn (two with Double Cast). */
  cardsPlayedThisTurn: number;
  /** Ability the current player used this turn, whose effect lasts until the turn ends. */
  abilityInUse: AbilityId | null;
  /** An extra turn earned by a card's movement, honoured when this turn ends. */
  bonusTurn: boolean;
  pendingDiscard: PendingDiscard | null;
  pendingWard: PendingWard | null;
  /** Tiles holding a hidden trap right now. Server-side secret once rooms exist. */
  hiddenTraps: readonly TileId[];
  /** Tiles whose trap (hidden or not) the Trap Ward smashed: they stay harmless for good. */
  destroyedTraps: readonly TileId[];
}
