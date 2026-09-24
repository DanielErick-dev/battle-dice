import { HAND_LIMIT } from "./cards";
import type { GameEvent } from "./events";
import type { CardInstance, GameState, Player, PlayerId, TileId } from "./types";

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
}

export function startDraft(state: GameState): Draft {
  return { state, players: [...state.players], events: [], extraTurn: false, overflow: null };
}

export function playerIn(draft: Draft, playerId: PlayerId): Player {
  const player = draft.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}

export function updatePlayer(draft: Draft, playerId: PlayerId, patch: (player: Player) => Partial<Player>): void {
  draft.players = draft.players.map((player) => (player.id === playerId ? { ...player, ...patch(player) } : player));
}

/** Draws the top card into the hand, or sets it aside as overflow when the hand is full. */
export function drawCard(draft: Draft, playerId: PlayerId): void {
  const [card, ...deck] = playerIn(draft, playerId).deck;
  if (!card) return;

  if (playerIn(draft, playerId).hand.length < HAND_LIMIT) {
    updatePlayer(draft, playerId, (player) => ({ deck, hand: [...player.hand, card] }));
    draft.events.push({ type: "cardDrawn", playerId, card });
  } else {
    updatePlayer(draft, playerId, () => ({ deck }));
    draft.overflow = card;
    draft.events.push({ type: "discardRequired", playerId, card });
  }
}

/** Tiles visited step by step. Movement stops at the finish tile (no bounce back). */
export function walkPath(origin: TileId, steps: number, finish: TileId): TileId[] {
  const path: TileId[] = [];
  for (let tile = origin + 1; tile <= Math.min(origin + steps, finish); tile++) {
    path.push(tile);
  }
  return path;
}
