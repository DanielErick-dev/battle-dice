import { HAND_LIMIT } from "./cards";
import { throwOnPile } from "./deck";
import type { GameEvent } from "./events";
import { shuffle, type RandomSource } from "./random";
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

/** Mutable working copy the rules write to in sequence; the command then seals it into the next state. */
export interface Draft {
  readonly state: GameState;
  players: Player[];
  events: GameEvent[];
  extraTurn: boolean;
  /** Cards that came to a full hand, in order, each waiting for a discard (see PendingDiscard). */
  overflow: OverflowCard[];
  /** Resolving stops here until the player answers. */
  pendingWard: { tile: TileId; threat: Threat } | null;
  /** Resolving stops here until Seraphiel picks. */
  pendingGrace: { tile: TileId; offer: "blessing" | "relic" } | null;
  hiddenTraps: TileId[];
  destroyedTraps: TileId[];
  pinnedTraps: TileId[];
  seals: Seal[];
  specters: Specter[];
  enchantedTiles: EnchantedTile[];
  blackFlames: BlackFlame[];
  winter: Winter | null;
  /** A Plunder specter caught someone this command; settle turns it into a PendingPlunder. */
  plunder: { owner: PlayerId; victim: PlayerId } | null;
  /** For reshuffles and moving sprung hidden traps. */
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

/** The command sets the turn and pending fields itself. */
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

interface OverflowCard {
  playerId: PlayerId;
  card: CardInstance;
}

/** An empty deck is first rebuilt from the shuffled discard pile. */
export function drawCard(draft: Draft, playerId: PlayerId): void {
  if (playerIn(draft, playerId).deck.length === 0) reshuffleDiscard(draft, playerId);

  const [card, ...deck] = playerIn(draft, playerId).deck;
  if (!card) return;
  updatePlayer(draft, playerId, () => ({ deck }));
  giveCard(draft, playerId, card);
}

/** A full hand queues the card as overflow, so none is ever lost without the player's choice. */
export function giveCard(draft: Draft, playerId: PlayerId, card: CardInstance): void {
  const waiting = draft.overflow.some((overflow) => overflow.playerId === playerId);
  if (!waiting && playerIn(draft, playerId).hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
    return;
  }
  if (draft.overflow.length === 0) draft.events.push({ type: "discardRequired", playerId, card });
  draft.overflow.push({ playerId, card });
}

/** A brand-new card: into the hand, or straight onto the discard pile when it's full (no discard prompt). */
export function conjureCard(draft: Draft, playerId: PlayerId, card: CardInstance): void {
  const { hand } = playerIn(draft, playerId);
  if (hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
  } else {
    updatePlayer(draft, playerId, (player) => ({ discard: throwOnPile(player.discard, [card]) }));
    draft.events.push({ type: "cardDiscarded", playerId, card, hand });
  }
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

/** Stops at the finish tile (no bounce back). */
export function walkPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  return followPath(origin, steps, (tile) => nextTile(board, tile, entry));
}

export function pushPath(board: Board, origin: TileId, steps: number, entry?: RealmEntry | null): TileId[] {
  return followPath(origin, steps, (tile) => previousTile(board, tile, entry));
}

function followPath(origin: TileId, steps: number, step: (tile: TileId) => TileId | null): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let taken = 0; taken < steps; taken++) {
    tile = step(tile);
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}

/** Cards that don't fit `to`'s hand wait as overflow for them to make room. */
export function handOverCards(draft: Draft, from: PlayerId, to: PlayerId, cards: readonly CardInstance[]): void {
  if (cards.length === 0) return;
  const room = draft.overflow.some((overflow) => overflow.playerId === to)
    ? 0
    : Math.max(0, HAND_LIMIT - playerIn(draft, to).hand.length);
  const kept = cards.slice(0, room);
  const taken = new Set(cards.map((card) => card.uid));
  updatePlayer(draft, from, (player) => ({ hand: player.hand.filter((held) => !taken.has(held.uid)) }));
  updatePlayer(draft, to, (player) => ({ hand: [...player.hand, ...kept] }));
  draft.events.push({ type: "cardsStolen", playerId: to, from, cards: [...kept], discarded: [] });
  for (const card of cards.slice(room)) giveCard(draft, to, card);
}
