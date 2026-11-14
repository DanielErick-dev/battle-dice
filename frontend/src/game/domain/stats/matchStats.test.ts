import { describe, expect, it } from "vitest";
import { awardsOf, emptyStats, tallyStats } from "./matchStats";
import { card, newGame, roll, withTileEffect } from "../testing";
import type { BoardDefinition } from "../board/board";
import type { GameEvent } from "../core/events";

const players = [{ id: "a" }, { id: "b" }];

describe("match stats", () => {
  it("counts rolls, walks, traps, pushes, cards and steals from the events", () => {
    const events: GameEvent[] = [
      { type: "diceRolled", playerId: "a", value: 5, dice: [5] },
      { type: "playerMoved", playerId: "a", path: [2, 3, 4, 5, 6] },
      { type: "trapTriggered", playerId: "a", from: 6, to: 2 },
      { type: "playerPushed", playerId: "b", by: "a", path: [3, 2, 1] },
      { type: "cardPlayed", playerId: "b", card: card("windStep"), targetId: null, value: null },
      { type: "cardsStolen", playerId: "b", from: "a", cards: [card("healingHerb")], discarded: [] },
      { type: "turnSkipped", playerId: "b" },
    ];
    const stats = tallyStats(emptyStats(players), events);
    expect(stats.a).toMatchObject({ rolls: 1, biggestRoll: 5, tilesWalked: 5, trapsHit: 1, cardsLost: 1 });
    expect(stats.b).toMatchObject({ tilesPushedBack: 3, cardsPlayed: 1, cardsStolen: 1, turnsLost: 1 });
  });

  it("starts over on a restart", () => {
    const rolled = tallyStats(emptyStats(players), [{ type: "diceRolled", playerId: "a", value: 6, dice: [6] }]);
    expect(tallyStats(rolled, [{ type: "gameRestarted" }]).a?.rolls).toBe(0);
  });

  it("gives each award to whoever topped its stat, and none for a zero", () => {
    const stats = tallyStats(emptyStats(players), [
      { type: "diceRolled", playerId: "b", value: 6, dice: [6] },
      { type: "diceRolled", playerId: "a", value: 2, dice: [2] },
    ]);
    const awards = awardsOf(stats);
    expect(awards).toContainEqual({ id: "highRoller", playerId: "b", value: 6 });
    expect(awards.find((award) => award.id === "thief")).toBeUndefined();
  });

  it("adds up a real roll's events", () => {
    const board: BoardDefinition = { size: 30, effects: {} };
    const start = withTileEffect(newGame(board, { a: null, b: null }), 5, { kind: "trap", to: 2 });
    const { events } = roll(start, "a", 4);
    expect(tallyStats(emptyStats(players), events).a).toMatchObject({ rolls: 1, tilesWalked: 4, trapsHit: 1 });
  });
});
