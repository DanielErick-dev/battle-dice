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
  /** With a `cardId` (a celestial relic on the tile), hands that very card instead of a draw. */
  | { kind: "card"; cardId?: CardId }
  /** Realm track tiles: a curse without the knock-back, or a blessing. */
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "blessing"; blessing: Blessing };

/** Side worlds a portal can open into: fire and curses, or light and blessings. */
export type RealmKind = "infernal" | "celestial";

/** TimedBlessings only lie in heaven; "charge" (a turn of ability charge) only on the main path. */
export type Blessing = "energy" | "charge" | "shield" | TimedBlessing;

/** Heaven's blessings, each lasting BLESSING_TURNS rounds (see blessings.ts). */
export type TimedBlessing = "wings" | "halo" | "inspiration" | "spring";

export interface ActiveBlessing {
  kind: TimedBlessing;
  turnsLeft: number;
  /** Received this turn: the turn ending doesn't count towards it. */
  fresh: boolean;
}

/** What a trap takes besides the tiles: a random hand card, or energy. */
export type TrapCurse = "discard" | "drain";

/** What kept a trap, curse or lost-turn tile off a player ("fallen": the Fallen Angel in his own hell). */
export type TrapWard = "shield" | "ability" | "halo" | "untamed" | "susanoo" | "fallen";

/** Seraphiel's crown (see seraph.ts): won coming out of heaven, turned infernal by the Fall. */
export type Crown = "seraphic" | "infernal";

export type TileRole = "start" | "finish" | "regular" | "track";

export interface Tile {
  id: TileId;
  role: TileRole;
  effect: TileEffect;
  /** Where walking forward leads; null on the finish. Track tiles lead on to the track's exit. */
  next: TileId | null;
  /** Where being pushed back leads; null on the start. A track's first tile leads back to its portal. */
  previous: TileId | null;
  track?: TrackPlacement;
}

export interface TrackPlacement {
  realm: RealmKind;
  /** The track's first portal when several open onto it (see RealmTrack.entries). */
  portal: TileId;
  index: number;
}

/** One track per realm, shared by every portal into it; each leaves where its own portal leads. */
export interface RealmTrack {
  realm: RealmKind;
  portal: TileId;
  exit: TileId;
  tiles: readonly TileId[];
  /** The first entry is `portal` and `exit`. */
  entries: readonly RealmEntry[];
}

export interface RealmEntry {
  portal: TileId;
  exit: TileId;
}

/** A stretch of plain-looking tiles where `traps` hidden traps spring, then move elsewhere in it. */
export interface TrapZone {
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
  /** +1 every TURNS_PER_ENERGY of the player's turns. */
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
  diceBoost: DiceBoost | null;
  /** Stack with each other (card combos) and with diceBoost. */
  diceBonuses: readonly DiceBonus[];
  ability: AbilityId | null;
  /** Ready at its abilityCycle; emptied when used. */
  abilityCharge: number;
  /** Own turns left under Levitation, the current one included. */
  levitating: number;
  /** No cards while above 0; counts down as own turns start, so the struck turn and the next are silent. */
  silencedTurns: number;
  /** Own turns left under Spectral Armour (nothing aimed at them gets through), the current one included. */
  spectralArmour: number;
  /** Own turns left under the Heavenly Aegis relic, the only thing that keeps Time Warp off. */
  divineAegis: number;
  /** Own turns left Untamed (nothing harms them, see isUntouchable), the current one included. */
  untamed: number;
  blessings: readonly ActiveBlessing[];
  /** Rolls left that walk the player backwards (Time Warp's reverse). */
  reversedRolls: number;
  /** Stuck in the fairy's snow: each of the `rounds` lost drains 1 energy into her. */
  snowbound: { owner: PlayerId; rounds: number } | null;
  /** How they entered their current realm track, so being pushed off either end lands on the right tile. */
  realmEntry: RealmEntry | null;
  /** Own turns that start without charging: Time Warp's charge waits for the rounds it bent to pass. */
  chargeHeld: number;
  /** Adds CROWN_BONUS to every roll for the rest of the match. */
  crown: Crown | null;
  /** Lost turns left in heaven's chains (see seraph.ts); shown standing, not sitting. */
  chained: number;
}

/** The Shadow Warden's apparitions (see specters.ts). */
export type SpecterKind = "plunder" | "hunger";

/** Strikes whoever else walks through its tile. */
export interface Specter {
  tile: TileId;
  kind: SpecterKind;
  owner: PlayerId;
}

/** `owner` picks which of `victim`'s cards their Plunder specter takes. */
export interface PendingPlunder {
  owner: PlayerId;
  victim: PlayerId;
  /** Caught during a roll, so the turn ends once the cards are picked. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

/** A harmful tile the Crystal Fairy enchanted for good (see fairy.ts). */
export interface EnchantedTile {
  tile: TileId;
  owner: PlayerId;
}

/** The Crystal Fairy's Eternal Winter: the path freezes from the start, WINTER_TILES more every round (see fairy.ts). */
export interface Winter {
  owner: PlayerId;
  /** Last tile frozen so far (the start when none yet). */
  frontier: TileId;
}

/** A tile on black fire from the Purgatory Kunoichi's Eternal Flames (see kunoichi.ts). */
export interface BlackFlame {
  tile: TileId;
  owner: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
  /** It goes out at FLAME_HITS. */
  hits: number;
}

/** The Flesh Scribe's four forbidden seals (see seals.ts). */
export type SealKind = "tithe" | "ruin" | "silence" | "bloodPact";

/** Only `owner` knows its `kind`; to everyone else all seals look alike. */
export interface Seal {
  tile: TileId;
  kind: SealKind;
  owner: PlayerId;
}

/** One physical copy of a card; `uid` tells copies of the same card apart. */
export interface CardInstance {
  uid: string;
  cardId: CardId;
  /** Brought back by Resurrection: gone for good once it leaves the hand. */
  risen?: boolean;
  /** See fusion.ts. */
  fused?: boolean;
}

export type DiceBoost =
  /** Two dice, added up (Berserk Fury). */
  | { kind: "double" }
  /** Two dice, the higher one counts (Oracle Eye). */
  | { kind: "best" }
  /** A chosen value instead of a throw (Fate Rune). */
  | { kind: "fixed"; value: number };

/** Added to each of the next `rolls` rolls, however the dice are thrown. */
export interface DiceBonus {
  amount: number;
  rolls: number;
}

/** What's about to strike a player who could ward it off with their ability. */
export type Threat = "trap" | "hiddenTrap" | "curse";

/** Waiting on the player's choice to spend their reactive ability on a trap or curse. */
export interface PendingWard {
  playerId: PlayerId;
  tile: TileId;
  threat: Threat;
  /** Struck during a roll, so the turn ends once it's answered. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

/** Seraphiel picks which blessing or relic of the heaven tile he receives (see seraph.ts). */
export interface PendingGrace {
  playerId: PlayerId;
  tile: TileId;
  offer: "blessing" | "relic";
  /** Offered during a roll, so the turn ends once he has picked. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

/** A drawn card that doesn't fit the hand: the player must discard one before play goes on. */
export interface PendingDiscard {
  playerId: PlayerId;
  drawn: CardInstance;
  /** More cards that came to a full hand after this one, each asking for a discard in turn. */
  queued: readonly { playerId: PlayerId; card: CardInstance }[];
  /** Drawn during a roll, so the turn ends once the discard is chosen. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

export type GameStatus = "playing" | "finished";

export interface GameState {
  board: Board;
  players: readonly Player[];
  /** Kept to reshuffle on restart. */
  decks: Readonly<Record<PlayerId, readonly CardId[]>>;
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId: PlayerId | null;
  turn: number;
  /** One card per turn (two with Double Cast). */
  cardsPlayedThisTurn: number;
  /** Its effect lasts until the turn ends. */
  abilityInUse: AbilityId | null;
  /** An extra turn earned by a card's movement, honoured when this turn ends. */
  bonusTurn: boolean;
  pendingDiscard: PendingDiscard | null;
  pendingWard: PendingWard | null;
  pendingGrace: PendingGrace | null;
  /** Server-side secret once rooms exist. */
  hiddenTraps: readonly TileId[];
  /** Smashed by the Trap Ward: harmless for good. */
  destroyedTraps: readonly TileId[];
  /** Pinned by Arrow Rain: harmless until a walk passes over them. */
  pinnedTraps: readonly TileId[];
  /** Kinds are the owner's secret once rooms exist. */
  seals: readonly Seal[];
  specters: readonly Specter[];
  enchantedTiles: readonly EnchantedTile[];
  blackFlames: readonly BlackFlame[];
  winter: Winter | null;
  pendingPlunder: PendingPlunder | null;
}
