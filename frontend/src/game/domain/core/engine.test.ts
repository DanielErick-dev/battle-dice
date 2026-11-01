import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "../board/presets";
import { GameRuleError } from "./errors";
import { createGame } from "./engine";
import { newGame, roll, send, withPlayer } from "../testing";

const duo = () => newGame(CLASSIC_BOARD, { p1: null, p2: null });
const positions = (state: ReturnType<typeof duo>) => state.players.map((player) => player.position);

describe("createGame", () => {
  it("places every player on the start tile and gives the turn to the first one", () => {
    const game = createGame(CLASSIC_BOARD, [
      { id: "p1", name: "Aria" },
      { id: "p2", name: "Bran" },
    ]);
    expect(positions(game)).toEqual([1, 1]);
    expect(game.currentPlayerIndex).toBe(0);
    expect(game.status).toBe("playing");
  });
});

describe("rollDice", () => {
  it("walks tile by tile and passes the turn", () => {
    const { state, events } = roll(duo(), "p1", 3);
    expect(state.players[0].position).toBe(4);
    expect(state.currentPlayerIndex).toBe(1);
    expect(events).toEqual([
      { type: "diceRolled", playerId: "p1", value: 3, dice: [3] },
      { type: "playerMoved", playerId: "p1", path: [2, 3, 4] },
      { type: "turnChanged", playerId: "p2" },
    ]);
  });

  it("teleports forward when landing on a portal", () => {
    const { state, events } = roll(duo(), "p1", 4);
    expect(state.players[0].position).toBe(10);
    expect(events).toContainEqual({ type: "portalEntered", playerId: "p1", from: 5, to: 10 });
  });

  it("sends the player back when landing on a trap", () => {
    const { state, events } = roll(withPlayer(duo(), "p1", { position: 6 }), "p1", 2);
    expect(state.players[0].position).toBe(6);
    expect(events).toContainEqual({ type: "trapTriggered", playerId: "p1", from: 8, to: 6 });
  });

  it("stops on the finish tile and ends the game", () => {
    const { state, events } = roll(withPlayer(duo(), "p1", { position: 17 }), "p1", 6);
    expect(events[1]).toEqual({ type: "playerMoved", playerId: "p1", path: [18, 19, 20] });
    expect(state.status).toBe("finished");
    expect(state.winnerId).toBe("p1");
    expect(events.at(-1)).toEqual({ type: "playerWon", playerId: "p1" });
  });

  it("rejects a roll out of turn", () => {
    expect(() => roll(duo(), "p2", 1)).toThrow(new GameRuleError("NOT_YOUR_TURN"));
  });

  it("rejects a roll after the game is over", () => {
    const { state } = roll(withPlayer(duo(), "p1", { position: 19 }), "p1", 1);
    expect(() => roll(state, "p2", 1)).toThrow(new GameRuleError("GAME_FINISHED"));
  });
});

describe("restart", () => {
  it("resets positions, status and turn order", () => {
    const finished = roll(withPlayer(duo(), "p1", { position: 19 }), "p1", 1).state;
    const { state } = send(finished, { type: "restart" });
    expect(positions(state)).toEqual([1, 1]);
    expect(state.status).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);
  });
});
