import { createBoard, getTile, type BoardDefinition } from "./board";
import { GameRuleError, type GameCommand } from "./commands";
import type { DiceRoller } from "./dice";
import type { GameEvent } from "./events";
import type { GameState, Player, PlayerId, TileId } from "./types";

export interface NewPlayer {
  id: PlayerId;
  name: string;
}

export interface GameDependencies {
  rollDice: DiceRoller;
}

export interface GameTransition {
  state: GameState;
  events: GameEvent[];
}

export function createGame(board: BoardDefinition, players: readonly NewPlayer[]): GameState {
  if (players.length === 0) throw new Error("A game needs at least one player");

  const createdBoard = createBoard(board);
  return {
    board: createdBoard,
    players: players.map((player) => ({ ...player, position: createdBoard.startTile, skipTurns: 0 })),
    currentPlayerIndex: 0,
    status: "playing",
    winnerId: null,
    turn: 1,
  };
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Pure reducer: same state + same dice = same result, on the client or on a server. */
export function applyCommand(
  state: GameState,
  command: GameCommand,
  deps: GameDependencies,
): GameTransition {
  switch (command.type) {
    case "rollDice":
      return rollDice(state, command.playerId, deps);
    case "restart":
      return restart(state);
  }
}

function rollDice(state: GameState, playerId: PlayerId, deps: GameDependencies): GameTransition {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  if (!state.players.some((player) => player.id === playerId)) {
    throw new GameRuleError("UNKNOWN_PLAYER");
  }
  if (currentPlayer(state).id !== playerId) throw new GameRuleError("NOT_YOUR_TURN");

  const { board } = state;
  const value = deps.rollDice();
  const origin = currentPlayer(state).position;
  const path = walkPath(origin, value, board.finishTile);
  const landed = path.at(-1) ?? origin;
  const events: GameEvent[] = [
    { type: "diceRolled", playerId, value },
    { type: "playerMoved", playerId, path },
  ];

  const outcome = resolveLanding(state, playerId, landed);
  events.push(...outcome.events);

  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, position: outcome.position, skipTurns: player.skipTurns + outcome.skipTurns }
      : player,
  );

  if (outcome.position === board.finishTile) {
    events.push({ type: "playerWon", playerId });
    return {
      state: { ...state, players, status: "finished", winnerId: playerId },
      events,
    };
  }

  const next = outcome.extraTurn
    ? { players, index: state.currentPlayerIndex, events: [] }
    : passTurn(players, state.currentPlayerIndex);
  events.push(...next.events, { type: "turnChanged", playerId: next.players[next.index].id });

  return {
    state: { ...state, players: next.players, currentPlayerIndex: next.index, turn: state.turn + 1 },
    events,
  };
}

interface LandingOutcome {
  position: TileId;
  events: GameEvent[];
  extraTurn: boolean;
  skipTurns: number;
}

/** Applies the effect of the tile the player stopped on. Destinations never chain into another effect. */
function resolveLanding(state: GameState, playerId: PlayerId, landed: TileId): LandingOutcome {
  const { effect } = getTile(state.board, landed);
  const outcome: LandingOutcome = { position: landed, events: [], extraTurn: false, skipTurns: 0 };

  switch (effect.kind) {
    case "portal":
      outcome.events.push({ type: "portalEntered", playerId, from: landed, to: effect.to });
      outcome.position = effect.to;
      break;
    case "trap":
      outcome.events.push({ type: "trapTriggered", playerId, from: landed, to: effect.to });
      outcome.position = effect.to;
      break;
    case "advance":
      outcome.events.push(
        { type: "advanceTriggered", playerId, from: landed, to: effect.to },
        { type: "playerMoved", playerId, path: walkPath(landed, effect.to - landed, state.board.finishTile) },
      );
      outcome.position = effect.to;
      break;
    case "extraTurn":
      outcome.events.push({ type: "extraTurnGranted", playerId, tile: landed });
      outcome.extraTurn = true;
      break;
    case "skipTurn":
      outcome.events.push({ type: "skipTurnGained", playerId, tile: landed });
      outcome.skipTurns = 1;
      break;
    case "none":
      break;
  }
  return outcome;
}

/**
 * Hands the turn to the next player, passing over (and consuming) pending skips.
 * Terminates because every pass decrements a skip counter.
 */
function passTurn(
  players: readonly Player[],
  currentIndex: number,
): { players: readonly Player[]; index: number; events: GameEvent[] } {
  const next = [...players];
  const events: GameEvent[] = [];
  let index = (currentIndex + 1) % next.length;

  while (next[index].skipTurns > 0) {
    next[index] = { ...next[index], skipTurns: next[index].skipTurns - 1 };
    events.push({ type: "turnSkipped", playerId: next[index].id });
    index = (index + 1) % next.length;
  }
  return { players: next, index, events };
}

function restart(state: GameState): GameTransition {
  const players = state.players.map((player) => ({ ...player, position: state.board.startTile, skipTurns: 0 }));
  return {
    state: { ...state, players, currentPlayerIndex: 0, status: "playing", winnerId: null, turn: 1 },
    events: [{ type: "gameRestarted" }, { type: "turnChanged", playerId: players[0].id }],
  };
}

/** Tiles visited step by step. Movement stops at the finish tile (no bounce back). */
function walkPath(origin: TileId, steps: number, finish: TileId): TileId[] {
  const path: TileId[] = [];
  for (let tile = origin + 1; tile <= Math.min(origin + steps, finish); tile++) {
    path.push(tile);
  }
  return path;
}
