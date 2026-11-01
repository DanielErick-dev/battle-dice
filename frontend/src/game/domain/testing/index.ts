import { expect } from "vitest";
import { abilityCycle } from "../abilities/charge";
import type { AbilityId } from "../abilities/ability";
import type { BoardDefinition } from "../board/board";
import type { CardId } from "../cards/catalog";
import { GameRuleError, type GameErrorCode } from "../core/errors";
import type { GameCommand } from "../core/commands";
import { sequenceDice } from "../core/dice";
import { applyCommand, createGame } from "../core/engine";
import type { GameTransition } from "../handlers/types";
import type { GameEvent } from "../core/events";
import { seededRandom } from "../random";
import type { CardInstance, GameState, Player, PlayerId, TileEffect, TileId } from "../types";

export * from "./boards";

/** Seed for dealing and hiding traps when a test game is created. */
export const GAME_SEED = 7;
/** Seed for the shuffles and random picks made while a command resolves. */
export const COMMAND_SEED = 3;

export type ActivateOptions = Omit<Extract<GameCommand, { type: "activateAbility" }>, "type" | "playerId">;
export type PlayOptions = Omit<Extract<GameCommand, { type: "playCard" }>, "type" | "playerId" | "cardUid">;

/** A game in seat order, e.g. `newGame(BOARD, { hero: "fairyBloom", rival: null })`. */
export function newGame(
  board: BoardDefinition,
  seats: Record<PlayerId, AbilityId | null>,
  seed = GAME_SEED,
): GameState {
  const players = Object.entries(seats).map(([id, ability]) => ({ id, name: id, ability }));
  return createGame(board, players, { random: seededRandom(seed) });
}

export function withPlayer(state: GameState, id: PlayerId, patch: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...patch } : player)) };
}

/** Patches several players at once, e.g. `withPlayers(state, { p1: { position: 10 }, p2: { position: 30 } })`. */
export function withPlayers(state: GameState, patches: Record<PlayerId, Partial<Player>>): GameState {
  return { ...state, players: state.players.map((player) => ({ ...player, ...patches[player.id] })) };
}

export function playerOf(state: GameState, id: PlayerId): Player {
  const found = state.players.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No player ${id}`);
  return found;
}

/** Fills the player's ability charge so it can be activated right away. */
export function readyAbility(state: GameState, id: PlayerId): GameState {
  return withPlayer(state, id, { abilityCharge: abilityCycle(playerOf(state, id).ability) });
}

/** Hands the turn to `id` without playing the turns in between. */
export function onTurnOf(state: GameState, id: PlayerId): GameState {
  return { ...state, currentPlayerIndex: state.players.findIndex((player) => player.id === id) };
}

export function withTileEffect(state: GameState, tile: TileId, effect: TileEffect): GameState {
  const tiles = state.board.tiles.map((candidate) => (candidate.id === tile ? { ...candidate, effect } : candidate));
  return { ...state, board: { ...state.board, tiles } };
}

export const card = (cardId: CardId, uid = `test:${cardId}`): CardInstance => ({ uid, cardId });

/** One card per id, with uids `c0`, `c1`… */
export const cards = (...ids: CardId[]): CardInstance[] => ids.map((cardId, i) => ({ uid: `c${i}`, cardId }));

/** `count` copies of a card, with uids `${uidPrefix}0`, `${uidPrefix}1`… */
export const copies = (cardId: CardId, count: number, uidPrefix: string): CardInstance[] =>
  Array.from({ length: count }, (_, i) => ({ uid: `${uidPrefix}${i}`, cardId }));

/** Resolves a command with loaded dice: each roll takes the next value of `dice`. */
export function send(
  state: GameState,
  command: GameCommand,
  dice: readonly number[] = [1],
  seed = COMMAND_SEED,
): GameTransition {
  return applyCommand(state, command, { rollDice: sequenceDice([...dice]), random: seededRandom(seed) });
}

export const roll = (state: GameState, playerId: PlayerId, ...dice: number[]) =>
  send(state, { type: "rollDice", playerId }, dice.length > 0 ? dice : [1]);

export const activate = (state: GameState, playerId: PlayerId, options: ActivateOptions = {}, dice = [1]) =>
  send(state, { type: "activateAbility", playerId, ...options }, dice);

export const play = (state: GameState, playerId: PlayerId, cardUid: string, options: PlayOptions = {}) =>
  send(state, { type: "playCard", playerId, cardUid, ...options });

export const discard = (state: GameState, playerId: PlayerId, cardUid: string) =>
  send(state, { type: "discardCard", playerId, cardUid });

/** Rolls 1s for `turns` turns; `readyAt` lists the turns that started with the ability freshly charged. */
export function turnsAbilityReady(start: GameState, playerId: PlayerId, turns: number) {
  let state = start;
  const readyAt: number[] = [];
  for (let turn = 1; turn <= turns; turn++) {
    const next = roll(state, playerId, 1);
    if (hasEvent(next.events, "abilityReady")) readyAt.push(turn + 1);
    state = next.state;
  }
  return { state, readyAt };
}

export const hasEvent = (events: readonly GameEvent[], ...types: GameEvent["type"][]) =>
  events.some((event) => types.includes(event.type));

export const eventsOfType = <T extends GameEvent["type"]>(events: readonly GameEvent[], type: T) =>
  events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);

export function expectRuleError(action: () => unknown, code: GameErrorCode) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(GameRuleError);
    expect((error as GameRuleError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}
