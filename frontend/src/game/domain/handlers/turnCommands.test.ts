import { describe, expect, it } from "vitest";
import { eventsOfType, expectRuleError, newGame, playerOf, send } from "../testing";

const duo = () => newGame({ size: 30, effects: {} }, { p1: null, p2: null });

describe("running out of time", () => {
  it("ends the turn where it stands, and the next player is up", () => {
    const { state, events } = send(duo(), { type: "forfeitTurn", playerId: "p1" });
    expect(state.currentPlayerIndex).toBe(1);
    expect(playerOf(state, "p1").position).toBe(playerOf(duo(), "p1").position);
    expect(eventsOfType(events, "turnTimedOut")).toEqual([{ type: "turnTimedOut", playerId: "p1" }]);
  });

  it("loses an extra turn the turn had earned", () => {
    const { state } = send({ ...duo(), bonusTurn: true }, { type: "forfeitTurn", playerId: "p1" });
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("is only for whoever's turn it is", () => {
    expectRuleError(() => send(duo(), { type: "forfeitTurn", playerId: "p2" }), "NOT_YOUR_TURN");
  });
});
