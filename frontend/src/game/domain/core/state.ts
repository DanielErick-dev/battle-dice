import type { AbilityId } from "../abilities/ability";
import type { ActiveBlessing, Board, RealmEntry, Threat, TileId } from "../board/types";
import type { CardId } from "../cards/catalog";
import type { PlayerId } from "./ids";
import type { RngState } from "./random";
import type { AkaneState, ScarletFlame } from "../characters/akane/types";
import type { EnchantedTile, Winter } from "../characters/fairy/types";
import type { BlackFlame } from "../characters/kage/types";
import type { Seal } from "../characters/scribe/types";
import type { Crown } from "../characters/seraphiel/types";
import type { PendingPlunder, Specter } from "../characters/warden/types";
import type { VoidScar, ZarekState } from "../characters/zarek/types";
import type { Elementals, TenzaiState } from "../characters/tenzai/types";
import type { AlchemistState, Inversion, PendingRaid } from "../characters/alchemist/types";
import type { AlvaState } from "../characters/alva/types";
import type { VoidBound } from "../characters/zarek/apex";

export type { PlayerId };

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
  /** Uids of the discard-pile cards that were played: the graveyard the Alchemist picks from. */
  graveyard: readonly string[];
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
  /** Lost turns left in heaven's chains (see characters/seraphiel/); shown standing, not sitting. */
  chained: number;
  /** Zarek's Void and how long it has gone hungry (NO_ZAREK for everyone else). */
  zarek: ZarekState;
  /** Themis's Marks of Justice: one per attack aimed at an opponent; a marked one's next may be turned. */
  justiceMarks: number;
  /** Rolls left whose die can't go above CONTAINED_DIE (Themis's Containment Decree). */
  containedRolls: number;
  /** Own turns left on Akane's scarlet fire: rolls halved (rounded down), no energy gained. */
  burning: number;
  /** The Akane who set them alight: each round they burn, he takes FIRE_TOLL energy (see feedTheFire). */
  burnedBy: PlayerId | null;
  /** Akane's Inner Flame, Impetus, Pure Fuel and Ember Step (NO_AKANE for everyone else). */
  akane: AkaneState;
  /** Tenzai's orbit, Convergence and enchanted die (NO_TENZAI for everyone else). */
  tenzai: TenzaiState;
  /** The Alchemist's Condenser and banked extra turns; NO_ALCHEMIST for everyone else. */
  alchemist: AlchemistState;
  /** Unidade Alva's Memory Overload count; NO_ALVA for everyone else. */
  alva: AlvaState;
  /** Her Corrupted Cards: they weigh on the hand past its limit for her effects, and let her see it. */
  corrupted: number;
  /** Inside Zarek's Void (the Void Apex): their rolls walk him; counted down as their turns end. */
  voidBound: VoidBound | null;
  /** Her EMP, counted down as own turns start: blackout (no cards, no ability) above BROWNOUT_TURNS, brownout below. */
  emp: number;
}

/** One physical copy of a card; `uid` tells copies of the same card apart. */
export interface CardInstance {
  uid: string;
  cardId: CardId;
  /** Brought back by Resurrection: gone for good once it leaves the hand. */
  risen?: boolean;
  /** See cards/fusion.ts. */
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

/** Waiting on the player's choice to spend their reactive ability on a trap or curse. */
interface PendingWard {
  playerId: PlayerId;
  tile: TileId;
  threat: Threat;
  /** Struck during a roll, so the turn ends once it's answered. */
  endsTurn: boolean;
  /** That roll also earned an extra turn. */
  extraTurn: boolean;
}

/** Seraphiel picks which blessing or relic of the heaven tile he receives (see characters/seraphiel/). */
interface PendingGrace {
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

type GameStatus = "playing" | "finished";

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
  /** Traps, curses and lost-turn tiles smashed or swallowed by the Void: harmless for good. */
  destroyedTraps: readonly TileId[];
  /** Pinned by Arrow Rain: harmless until a walk passes over them. */
  pinnedTraps: readonly TileId[];
  /** Kinds are the owner's secret once rooms exist. */
  seals: readonly Seal[];
  specters: readonly Specter[];
  enchantedTiles: readonly EnchantedTile[];
  blackFlames: readonly BlackFlame[];
  scarletFlames: readonly ScarletFlame[];
  winter: Winter | null;
  /** Tiles Zarek's Void marked purple (see VoidScar). */
  voidScars: readonly VoidScar[];
  pendingPlunder: PendingPlunder | null;
  /** Tenzai's walls, bonds and (secret) breezes. */
  elementals: Elementals;
  /** The Alchemist's Great Inversion, while it lasts. */
  inversion: Inversion | null;
  /** The Alchemist picking cards from a graveyard (her Condenser or her cards). */
  pendingRaid: PendingRaid | null;
  /** Every die and shuffle draws from here, so a stateless server can resolve any command. */
  rng: RngState;
}
