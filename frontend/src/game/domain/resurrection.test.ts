import { describe, expect, it } from "vitest";
import { LONG_ABILITY_CYCLE, RESURRECTION_CARDS, abilityCycle } from "./abilities";
import { HAND_LIMIT } from "./cards";
import {
  TRAP_AND_CURSE_BOARD,
  activate,
  cards,
  copies,
  expectRuleError,
  newGame,
  play,
  playerOf,
  readyAbility,
  withPlayer,
} from "./testing";
import type { GameState, Player } from "./types";

const resurrect = (state: GameState, ...cardUids: string[]) => activate(state, "p1", { cardUids });
const shaman = (patch: Partial<Player>) =>
  withPlayer(readyAbility(newGame(TRAP_AND_CURSE_BOARD, { p1: "resurrection" }), "p1"), "p1", patch);
const pile = cards("windStep", "healingHerb", "arcaneShield");
const aria = (state: GameState) => playerOf(state, "p1");

describe("Resurrection", () => {
  it("brings the chosen discarded cards back to the hand, in the order picked", () => {
    const { state, events } = resurrect(shaman({ hand: [], discard: pile }), "c2", "c0");
    const risen = [
      { ...pile[2], risen: true },
      { ...pile[0], risen: true },
    ];
    expect(aria(state).hand).toEqual(risen);
    expect(aria(state).discard).toEqual([pile[1]]);
    expect(events).toContainEqual({ type: "cardsResurrected", playerId: "p1", cards: risen });
    expect(aria(state).abilityCharge).toBe(0);
  });

  it("charges over the long cycle", () => {
    expect(abilityCycle("resurrection")).toBe(LONG_ABILITY_CYCLE);
  });

  it("takes one card or up to the limit, never more than the hand has room for", () => {
    expect(aria(resurrect(shaman({ hand: [], discard: pile }), "c1").state).hand).toEqual([
      { ...pile[1], risen: true },
    ]);
    expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "c0", "c1", "c2"), "TOO_MANY_CARDS");
    const almostFull = copies("windStep", HAND_LIMIT - 1, "hc");
    expectRuleError(() => resurrect(shaman({ hand: almostFull, discard: pile }), "c0", "c1"), "TOO_MANY_CARDS");
    expect(RESURRECTION_CARDS).toBe(2);
  });

  it("needs cards from the player's own discard pile", () => {
    expectRuleError(() => resurrect(shaman({ hand: [], discard: pile })), "UNKNOWN_CARD");
    expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "nope"), "UNKNOWN_CARD");
    expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "c0", "c0"), "UNKNOWN_CARD");
    expectRuleError(() => resurrect(shaman({ hand: [], discard: [] }), "c0"), "EMPTY_DISCARD");
  });

  it("risen cards crumble to dust once played: they never reach the discard pile again", () => {
    const raised = resurrect(shaman({ hand: [], discard: pile, energy: 5 }), "c1").state;
    const played = play(raised, "p1", "c1").state;
    expect(aria(played).hand).toEqual([]);
    expect(aria(played).discard.map((card) => card.uid)).toEqual(["c0", "c2"]);
  });

  it("can't be used with a full hand", () => {
    const full = copies("windStep", HAND_LIMIT, "h");
    expectRuleError(() => resurrect(shaman({ hand: full, discard: pile }), "c0"), "HAND_FULL");
  });
});
