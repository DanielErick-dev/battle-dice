import { describe, expect, it } from "vitest";
import { HAND_LIMIT, SACRIFICE_ENERGY } from "./hand";
import { cards, copies, eventsOfType, expectRuleError, newGame, playerOf, send, withPlayer } from "../testing";
import type { GameState } from "../core/state";

const solo = (patch: Parameters<typeof withPlayer>[2]) =>
  withPlayer(newGame({ size: 30, effects: {} }, { p1: null, p2: null }), "p1", patch);
const sacrifice = (state: GameState) => send(state, { type: "sacrificeEnergy", playerId: "p1" });

describe("sacrificing energy", () => {
  it("trades energy for the top card of the deck", () => {
    const start = solo({ energy: 7, hand: [], deck: cards("windStep", "luckyCharm") });
    const { state, events } = sacrifice(start);
    expect(playerOf(state, "p1")).toMatchObject({ energy: 7 - SACRIFICE_ENERGY, hand: [{ cardId: "windStep" }] });
    expect(eventsOfType(events, "energySacrificed")).toHaveLength(1);
  });

  it("needs the energy, room in the hand and a card left", () => {
    expectRuleError(() => sacrifice(solo({ energy: SACRIFICE_ENERGY - 1 })), "NOT_ENOUGH_ENERGY");
    expectRuleError(() => sacrifice(solo({ energy: 10, hand: copies("windStep", HAND_LIMIT, "h") })), "HAND_FULL");
    expectRuleError(() => sacrifice(solo({ energy: 10, hand: [], deck: [], discard: [] })), "NO_CARDS_LEFT");
  });
});
