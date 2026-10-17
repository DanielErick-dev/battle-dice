import { HAND_LIMIT } from "./cards";
import { shuffle } from "./deck";
import type { GameEvent } from "./events";
import type { RandomSource } from "./random";
import { nextTile, previousTile } from "./board";
import type {
  BlackFlame,
  Board,
  CardInstance,
  EnchantedTile,
  GameState,
  Player,
  PlayerId,
  RealmEntry,
  Seal,
  Specter,
  Threat,
  TileId,
  Winter,
} from "./types";

/**
 * Working copy of a command's effects: several rules touch players and emit events in
 * sequence, then the command turns the draft into the next immutable state.
 */
export interface Draft {
  readonly state: GameState;
  players: Player[];
  events: GameEvent[];
  /** Landing earned another turn. */
  extraTurn: boolean;
  /**
   * Cards that came to a full hand, in order, each waiting for its player to throw one away (see
   * PendingDiscard); the command decides when the turn resumes.
   */
  overflow: OverflowCard[];
  /** A threat on this tile waits for the player's choice to ward it off; resolving stops here. */
  pendingWard: { tile: TileId; threat: Threat } | null;
  /** Seraphiel picks his gift from heaven on this tile; resolving stops here. */
  pendingGrace: { tile: TileId; offer: "blessing" | "relic" } | null;
  /** Where the hidden traps are; they move once sprung. */
  hiddenTraps: TileId[];
  /** Tiles whose trap the Trap Ward smashed for good. */
  destroyedTraps: TileId[];
  /** Tiles whose threat Arrow Rain pinned down for now. */
  pinnedTraps: TileId[];
  /** Seals on the board; they go once broken. */
  seals: Seal[];
  /** Apparitions on the board; they go once struck or dispelled. */
  specters: Specter[];
  /** Enchanted tiles; they stay for good. */
  enchantedTiles: EnchantedTile[];
  /** Tiles on black fire; they go out as their owner's turns pass. */
  blackFlames: BlackFlame[];
  winter: Winter | null;
  /** A Plunder specter caught someone this command: its owner picks the cards before play goes on. */
  plunder: { owner: PlayerId; victim: PlayerId } | null;
  /** Shuffles the discard pile back into an empty deck, and moves sprung hidden traps. */
  random: RandomSource;
}

export function startDraft(state: GameState, random: RandomSource): Draft {
  return {
    state,
    players: [...state.players],
    events: [],
    extraTurn: false,
    overflow: [],
    pendingWard: null,
    pendingGrace: null,
    hiddenTraps: [...state.hiddenTraps],
    destroyedTraps: [...state.destroyedTraps],
    pinnedTraps: [...state.pinnedTraps],
    seals: [...state.seals],
    specters: [...state.specters],
    enchantedTiles: [...state.enchantedTiles],
    blackFlames: [...state.blackFlames],
    winter: state.winter,
    plunder: null,
    random,
  };
}

/** The state with the draft's changes to players and traps; the command sets the rest. */
export function draftState(draft: Draft): GameState {
  return {
    ...draft.state,
    players: draft.players,
    hiddenTraps: draft.hiddenTraps,
    destroyedTraps: draft.destroyedTraps,
    pinnedTraps: draft.pinnedTraps,
    seals: draft.seals,
    specters: draft.specters,
    enchantedTiles: draft.enchantedTiles,
    blackFlames: draft.blackFlames,
    winter: draft.winter,
  };
}

export function playerIn(draft: Draft, playerId: PlayerId): Player {
  const player = draft.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}

export function updatePlayer(draft: Draft, playerId: PlayerId, patch: (player: Player) => Partial<Player>): void {
  draft.players = draft.players.map((player) => (player.id === playerId ? { ...player, ...patch(player) } : player));
}

/** A card that came to a full hand, waiting for `playerId` to throw one away. */
export interface OverflowCard {
  playerId: PlayerId;
  card: CardInstance;
}

/**
 * Draws the top card into the hand, or sets it aside as overflow when the hand is full. An
 * empty deck is first rebuilt from the shuffled discard pile.
 */
export function drawCard(draft: Draft, playerId: PlayerId): void {
  if (playerIn(draft, playerId).deck.length === 0) reshuffleDiscard(draft, playerId);

  const [card, ...deck] = playerIn(draft, playerId).deck;
  if (!card) return;
  updatePlayer(draft, playerId, () => ({ deck }));
  giveCard(draft, playerId, card);
}

/**
 * `card` goes into the player's hand, drawn, found or taken; a full hand makes them throw one away
 * first (see draft.overflow), one card at a time, so none is ever lost without their choice.
 */
export function giveCard(draft: Draft, playerId: PlayerId, card: CardInstance): void {
  const waiting = draft.overflow.some((overflow) => overflow.playerId === playerId);
  if (!waiting && playerIn(draft, playerId).hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({
      hand: [...player.hand, card],
    }));
    draft.events.push({ type: "cardDrawn", playerId, card });
    return;
  }
  if (draft.overflow.length === 0) draft.events.push({ type: "discardRequired", playerId, card });
  draft.overflow.push({ playerId, card });
}

function reshuffleDiscard(draft: Draft, playerId: PlayerId): void {
  const { discard } = playerIn(draft, playerId);
  if (discard.length === 0) return;
  updatePlayer(draft, playerId, () => ({
    deck: shuffle(discard, draft.random),
    discard: [],
  }));
  draft.events.push({ type: "deckReshuffled", playerId, size: discard.length });
}

/**
 * Tiles visited step by step, following each tile's `next` (through realm tracks and out of
 * them). Movement stops at the finish tile (no bounce back).
 */
export function walkPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let step = 0; step < steps; step++) {
    tile = nextTile(board, tile, entry);
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}

/** Tiles passed when knocked back `steps` tiles, following each tile's `previous`. */
export function pushPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let step = 0; step < steps; step++) {
    tile = previousTile(board, tile, entry);
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}

/**
 * `cards` leave `from`'s hand for `to`'s, in order; those that don't fit a full hand land on
 * `to`'s discard pile, theirs from then on all the same.
 */
export function handOverCards(draft: Draft, from: PlayerId, to: PlayerId, cards: readonly CardInstance[]): void {
  if (cards.length === 0) return;
  const room = draft.overflow.some((overflow) => overflow.playerId === to)
    ? 0
    : Math.max(0, HAND_LIMIT - playerIn(draft, to).hand.length);
  const kept = cards.slice(0, room);
  const taken = new Set(cards.map((card) => card.uid));
  updatePlayer(draft, from, (player) => ({
    hand: player.hand.filter((held) => !taken.has(held.uid)),
  }));
  updatePlayer(draft, to, (player) => ({ hand: [...player.hand, ...kept] }));
  draft.events.push({
    type: "cardsStolen",
    playerId: to,
    from,
    cards: [...kept],
    discarded: [],
  });
  // What doesn't fit waits for its new owner to make room, one card at a time.
  for (const card of cards.slice(room)) giveCard(draft, to, card);
}
