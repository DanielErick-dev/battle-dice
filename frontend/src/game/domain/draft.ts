import { HAND_LIMIT } from "./cards";
import { shuffle } from "./deck";
import type { GameEvent } from "./events";
import type { RandomSource } from "./random";
import { getTile } from "./board";
import type { Board, CardInstance, GameState, Player, PlayerId, Threat, TileId } from "./types";

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
  /** A card was drawn with a full hand; the command decides when the turn resumes. */
  overflow: CardInstance | null;
  /** A threat on this tile waits for the player's choice to ward it off; resolving stops here. */
  pendingWard: { tile: TileId; threat: Threat } | null;
  /** Where the hidden traps are; they move once sprung. */
  hiddenTraps: TileId[];
  /** Tiles whose trap the Trap Ward smashed for good. */
  destroyedTraps: TileId[];
  /** Shuffles the discard pile back into an empty deck, and moves sprung hidden traps. */
  random: RandomSource;
}

export function startDraft(state: GameState, random: RandomSource): Draft {
  return {
    state,
    players: [...state.players],
    events: [],
    extraTurn: false,
    overflow: null,
    pendingWard: null,
    hiddenTraps: [...state.hiddenTraps],
    destroyedTraps: [...state.destroyedTraps],
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

/**
 * Draws the top card into the hand, or sets it aside as overflow when the hand is full. An
 * empty deck is first rebuilt from the shuffled discard pile. Only one card can wait on a
 * discard, so nothing more is drawn while one does.
 */
export function drawCard(draft: Draft, playerId: PlayerId): void {
  if (draft.overflow) return;
  if (playerIn(draft, playerId).deck.length === 0) reshuffleDiscard(draft, playerId);

  const [card, ...deck] = playerIn(draft, playerId).deck;
  if (!card) return;

  if (playerIn(draft, playerId).hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({
      deck,
      hand: [...player.hand, card],
    }));
    draft.events.push({ type: "cardDrawn", playerId, card });
  } else {
    updatePlayer(draft, playerId, () => ({ deck }));
    draft.overflow = card;
    draft.events.push({ type: "discardRequired", playerId, card });
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

/**
 * Tiles visited step by step, following each tile's `next` (through realm tracks and out of
 * them). Movement stops at the finish tile (no bounce back).
 */
export function walkPath(board: Board, origin: TileId, steps: number): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let step = 0; step < steps; step++) {
    tile = getTile(board, tile).next;
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}

/** Tiles passed when knocked back `steps` tiles, following each tile's `previous`. */
export function pushPath(board: Board, origin: TileId, steps: number): TileId[] {
  const path: TileId[] = [];
  let tile: TileId | null = origin;
  for (let step = 0; step < steps; step++) {
    tile = getTile(board, tile).previous;
    if (tile === null) break;
    path.push(tile);
  }
  return path;
}
