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
    players: players.map((player) => ({ ...player, position: createdBoard.startTile })),
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

  const { effect } = getTile(board, landed);
  let finalPosition = landed;
  if (effect.kind === "portal") {
    events.push({ type: "portalEntered", playerId, from: landed, to: effect.to });
    finalPosition = effect.to;
  } else if (effect.kind === "trap") {
    events.push({ type: "trapTriggered", playerId, from: landed, to: effect.to });
    finalPosition = effect.to;
  }

  const players = state.players.map((player) =>
    player.id === playerId ? { ...player, position: finalPosition } : player,
  );

  if (finalPosition === board.finishTile) {
    events.push({ type: "playerWon", playerId });
    return {
      state: { ...state, players, status: "finished", winnerId: playerId },
      events,
    };
  }

  const currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  events.push({ type: "turnChanged", playerId: players[currentPlayerIndex].id });

  return {
    state: { ...state, players, currentPlayerIndex, turn: state.turn + 1 },
    events,
  };
}

function restart(state: GameState): GameTransition {
  const players = state.players.map((player) => ({ ...player, position: state.board.startTile }));
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
