import { createBoard, type BoardDefinition } from "../board/board";
import { characterDeck } from "../cards/decks";
import type { CardId } from "../cards/catalog";
import type { GameCommand } from "./commands";
import { COMMAND_HANDLERS } from "../handlers";
import { openingState, type NewPlayer } from "../handlers/setup";
import type { GameDependencies, GameTransition } from "../handlers/types";
import type { RandomSource } from "./random";
import type { GameState, PlayerId } from "./state";

export { currentPlayer } from "../handlers/shared";
export type { NewPlayer } from "../handlers/setup";
export type { GameDependencies, GameTransition } from "../handlers/types";

export interface GameOptions {
  random?: RandomSource;
  /** Defaults to the standard deck plus each character's own cards; collections will fill this in. */
  decks?: Readonly<Record<PlayerId, readonly CardId[]>>;
}

export function createGame(
  board: BoardDefinition,
  players: readonly NewPlayer[],
  options: GameOptions = {},
): GameState {
  if (players.length === 0) throw new Error("A game needs at least one player");

  const decks = Object.fromEntries(
    players.map((player) => [
      player.id,
      options.decks?.[player.id] ?? characterDeck(player.ability ?? null, { withOpponents: players.length > 1 }),
    ]),
  );
  return openingState(createBoard(board), players, decks, options.random ?? Math.random);
}

/** Pure reducer: same state + same dice and shuffles = same result, on the client or on a server. */
export function applyCommand(state: GameState, command: GameCommand, deps: GameDependencies): GameTransition {
  const handler = COMMAND_HANDLERS[command.type] as (
    state: GameState,
    command: GameCommand,
    deps: GameDependencies,
  ) => GameTransition;
  return handler(state, command, deps);
}
