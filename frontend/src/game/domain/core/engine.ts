import { createBoard, type BoardDefinition } from "../board/board";
import { abilityCycle } from "../abilities/charge";
import { characterDeck } from "../cards/decks";
import type { CardId } from "../cards/catalog";
import type { GameCommand } from "./commands";
import { resolveCommand } from "../handlers/resolve";
import { openingState, type NewPlayer } from "../handlers/setup";
import type { GameTransition } from "../handlers/types";
import { randomStream } from "./random";
import type { GameState, PlayerId } from "./state";

export { currentPlayer } from "../handlers/shared";
export type { NewPlayer } from "../handlers/setup";
export type { GameTransition } from "../handlers/types";

export interface GameOptions {
  /** Picked by whoever hosts the match (client or server); the rules never pick one themselves. */
  seed: number;
  /** Defaults to the standard deck plus each character's own cards; collections will fill this in. */
  decks?: Readonly<Record<PlayerId, readonly CardId[]>>;
  /** Test mode: every ability starts charged. */
  chargedAbilities?: boolean;
}

export function createGame(board: BoardDefinition, players: readonly NewPlayer[], options: GameOptions): GameState {
  if (players.length === 0) throw new Error("A game needs at least one player");
  if (!Number.isInteger(options.seed)) throw new Error("A game needs an integer seed");

  const decks = Object.fromEntries(
    players.map((player) => [
      player.id,
      options.decks?.[player.id] ?? characterDeck(player.ability ?? null, { withOpponents: players.length > 1 }),
    ]),
  );
  const stream = randomStream({ seed: options.seed >>> 0, counter: 0 });
  const opening = openingState(createBoard(board), players, decks, stream.random);
  const dealt = options.chargedAbilities
    ? opening.players.map((player) => ({ ...player, abilityCharge: abilityCycle(player.ability) }))
    : opening.players;
  return { ...opening, players: dealt, rng: stream.snapshot() };
}

/** Pure reducer: same state + same command = same result, since every die and shuffle comes from `state.rng`. */
export function applyCommand(state: GameState, command: GameCommand): GameTransition {
  return resolveCommand(state, command);
}
