import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "./board";
import { GameRuleError } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { GameState } from "./types";

const PLAYERS = [
  { id: "p1", name: "Goku" },
  { id: "p2", name: "Vegeta" },
];

function withPosition(state: GameState, playerId: string, position: number): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, position } : p)),
  };
}

const roll = (state: GameState, playerId: string, value: number) =>
  applyCommand(state, { type: "rollDice", playerId }, { rollDice: sequenceDice([value]), random: seededRandom(1) });

describe("createGame", () => {
  it("places every player on the start tile and gives the turn to the first one", () => {
    const game = createGame(CLASSIC_BOARD, PLAYERS);

    expect(game.players.map((p) => p.position)).toEqual([1, 1]);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.status).toBe("playing");
  });
});

describe("rollDice", () => {
  it("walks tile by tile and passes the turn", () => {
    const { state, events } = roll(createGame(CLASSIC_BOARD, PLAYERS), "p1", 3);

    expect(state.players[0].position).toBe(4);
    expect(state.currentPlayerIndex).toBe(1);
    expect(events).toEqual([
      { type: "diceRolled", playerId: "p1", value: 3, dice: [3] },
      { type: "playerMoved", playerId: "p1", path: [2, 3, 4] },
      { type: "turnChanged", playerId: "p2" },
    ]);
  });

  it("teleports forward when landing on a portal", () => {
    const { state, events } = roll(createGame(CLASSIC_BOARD, PLAYERS), "p1", 4);

    expect(state.players[0].position).toBe(10);
    expect(events).toContainEqual({ type: "portalEntered", playerId: "p1", from: 5, to: 10 });
  });

  it("sends the player back when landing on a trap", () => {
    const game = withPosition(createGame(CLASSIC_BOARD, PLAYERS), "p1", 6);
    const { state, events } = roll(game, "p1", 2);

    expect(state.players[0].position).toBe(6);
    expect(events).toContainEqual({ type: "trapTriggered", playerId: "p1", from: 8, to: 6 });
  });

  it("stops on the finish tile and ends the game", () => {
    const game = withPosition(createGame(CLASSIC_BOARD, PLAYERS), "p1", 17);
    const { state, events } = roll(game, "p1", 6);

    expect(events[1]).toEqual({ type: "playerMoved", playerId: "p1", path: [18, 19, 20] });
    expect(state.status).toBe("finished");
    expect(state.winnerId).toBe("p1");
    expect(events.at(-1)).toEqual({ type: "playerWon", playerId: "p1" });
  });

  it("rejects a roll out of turn", () => {
    const game = createGame(CLASSIC_BOARD, PLAYERS);

    expect(() => roll(game, "p2", 1)).toThrow(new GameRuleError("NOT_YOUR_TURN"));
  });

  it("rejects a roll after the game is over", () => {
    const game = withPosition(createGame(CLASSIC_BOARD, PLAYERS), "p1", 19);
    const { state } = roll(game, "p1", 1);

    expect(() => roll(state, "p2", 1)).toThrow(new GameRuleError("GAME_FINISHED"));
  });
});

describe("restart", () => {
  it("resets positions, status and turn order", () => {
    const game = withPosition(createGame(CLASSIC_BOARD, PLAYERS), "p1", 19);
    const finished = roll(game, "p1", 1).state;
    const { state } = applyCommand(finished, { type: "restart" }, { rollDice: sequenceDice([1]), random: seededRandom(1) });

    expect(state.players.map((p) => p.position)).toEqual([1, 1]);
    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);
  });
});

describe("special tiles", () => {
  const EFFECTS_BOARD = {
    size: 12,
    effects: {
      3: { kind: "advance", to: 6 },
      4: { kind: "extraTurn" },
      5: { kind: "skipTurn" },
    },
  } as const;

  it("walks forward tile by tile on an advance tile", () => {
    const { state, events } = roll(createGame(EFFECTS_BOARD, PLAYERS), "p1", 2);

    expect(events.slice(1, 4)).toEqual([
      { type: "playerMoved", playerId: "p1", path: [2, 3] },
      { type: "advanceTriggered", playerId: "p1", from: 3, to: 6 },
      { type: "playerMoved", playerId: "p1", path: [4, 5, 6] },
    ]);
    expect(state.players[0].position).toBe(6);
  });

  it("keeps the turn on an extra-turn tile", () => {
    const { state, events } = roll(createGame(EFFECTS_BOARD, PLAYERS), "p1", 3);

    expect(events).toContainEqual({ type: "extraTurnGranted", playerId: "p1", tile: 4 });
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p1" });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("passes over a player who lost their turn, once", () => {
    const afterP1 = roll(createGame(EFFECTS_BOARD, PLAYERS), "p1", 4).state;
    expect(afterP1.players[0].skipTurns).toBe(1);

    const afterP2 = roll(afterP1, "p2", 1);
    expect(afterP2.events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p2" },
    ]);
    expect(afterP2.state.players[0].skipTurns).toBe(0);

    const afterSkip = roll(afterP2.state, "p2", 1);
    expect(afterSkip.events.at(-1)).toEqual({ type: "turnChanged", playerId: "p1" });
  });

  it("consumes the skip right away when playing alone", () => {
    const { state, events } = roll(createGame(EFFECTS_BOARD, [PLAYERS[0]]), "p1", 4);

    expect(events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p1" },
    ]);
    expect(state.players[0].skipTurns).toBe(0);
  });
});
