import { describe, expect, it } from "vitest";
import type { BoardDefinition } from "./board";
import { CARD_PORTAL_TRAP_BOARD } from "../testing/boards";
import { card, hasEvent, newGame, play, playerOf, roll, withPlayer, withTileEffect } from "../testing";
import type { TrapCurse } from "./types";
import type { Player } from "../core/state";

describe("special tiles", () => {
  const EFFECTS_BOARD: BoardDefinition = {
    size: 12,
    effects: {
      3: { kind: "advance", to: 6 },
      4: { kind: "extraTurn" },
      5: { kind: "skipTurn" },
    },
  };
  const duo = () => newGame(EFFECTS_BOARD, { p1: null, p2: null });

  it("walks forward tile by tile on an advance tile", () => {
    const { state, events } = roll(duo(), "p1", 2);
    expect(events.slice(1, 4)).toEqual([
      { type: "playerMoved", playerId: "p1", path: [2, 3] },
      { type: "advanceTriggered", playerId: "p1", from: 3, to: 6 },
      { type: "playerMoved", playerId: "p1", path: [4, 5, 6] },
    ]);
    expect(playerOf(state, "p1").position).toBe(6);
  });

  it("keeps the turn on an extra-turn tile", () => {
    const { state, events } = roll(duo(), "p1", 3);
    expect(events).toContainEqual({ type: "extraTurnGranted", playerId: "p1", tile: 4 });
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p1" });
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("passes over a player who lost their turn, once", () => {
    const afterP1 = roll(duo(), "p1", 4).state;
    expect(playerOf(afterP1, "p1").skipTurns).toBe(1);

    const afterP2 = roll(afterP1, "p2", 1);
    expect(afterP2.events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p2" },
    ]);
    expect(playerOf(afterP2.state, "p1").skipTurns).toBe(0);

    const afterSkip = roll(afterP2.state, "p2", 1);
    expect(afterSkip.events.at(-1)).toEqual({ type: "turnChanged", playerId: "p1" });
  });

  it("spends an extra turn still owed as the first lost turn", () => {
    const { state, events } = roll({ ...duo(), bonusTurn: true }, "p1", 4);
    expect(events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p2" },
    ]);
    expect(playerOf(state, "p1").skipTurns).toBe(0);
    expect(roll(state, "p2", 1).events.at(-1)).toEqual({ type: "turnChanged", playerId: "p1" });
  });

  it("a card carrying them onto a lost turn ends the turn there and then, without a roll", () => {
    const windy = withPlayer(duo(), "p1", { position: 2, hand: [card("windStep", "w")], energy: 3 });
    const { state, events } = play(windy, "p1", "w");
    expect(playerOf(state, "p1")).toMatchObject({ position: 5, skipTurns: 1 });
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p2" });
    expect(state).toMatchObject({ cardsPlayedThisTurn: 0, bonusTurn: false });
  });

  it("consumes the skip right away when playing alone", () => {
    const { state, events } = roll(newGame(EFFECTS_BOARD, { p1: null }), "p1", 4);
    expect(events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p1" },
      { type: "turnChanged", playerId: "p1" },
    ]);
    expect(playerOf(state, "p1").skipTurns).toBe(0);
  });
});

describe("cursed traps", () => {
  /** One step before the trap at 12, cursed with `curse`. */
  const cursed = (curse: TrapCurse, patch: Partial<Player>) =>
    withPlayer(
      withTileEffect(newGame(CARD_PORTAL_TRAP_BOARD, { p1: null, p2: null }), 12, { kind: "trap", to: 8, curse }),
      "p1",
      { position: 11, ...patch },
    );

  it("throw away a random card from the hand", () => {
    const hand = [card("windStep", "a"), card("luckyCharm", "b")];
    const { state, events } = roll(cursed("discard", { hand }), "p1", 1);

    const cursedEvent = events.find((event) => event.type === "trapCursed");
    expect(cursedEvent).toMatchObject({ curse: "discard", energyLost: 0 });
    const lost = cursedEvent?.type === "trapCursed" ? cursedEvent.card : null;
    expect(hand).toContainEqual(lost);
    expect(playerOf(state, "p1").hand).toHaveLength(1);
    expect(playerOf(state, "p1").discard).toEqual([lost]);
    expect(playerOf(state, "p1").position).toBe(8);
  });

  it("take nothing from an empty hand", () => {
    const { events } = roll(cursed("discard", { hand: [] }), "p1", 1);
    expect(events).toContainEqual({ type: "trapCursed", playerId: "p1", curse: "discard", card: null, energyLost: 0 });
  });

  it("drain up to 2 energy", () => {
    const drained = roll(cursed("drain", { energy: 3 }), "p1", 1).state;
    expect(playerOf(drained, "p1").energy).toBe(1);

    const { state, events } = roll(cursed("drain", { energy: 1 }), "p1", 1);
    expect(playerOf(state, "p1").energy).toBe(0);
    expect(events).toContainEqual({ type: "trapCursed", playerId: "p1", curse: "drain", card: null, energyLost: 1 });
  });

  it("are stopped entirely by the Arcane Shield", () => {
    const { state, events } = roll(cursed("drain", { energy: 3, shielded: true }), "p1", 1);
    expect(hasEvent(events, "trapCursed")).toBe(false);
    expect(playerOf(state, "p1")).toMatchObject({ energy: 3, position: 12 });
  });
});
