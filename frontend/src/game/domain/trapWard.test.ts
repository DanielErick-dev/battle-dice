import { describe, expect, it } from "vitest";
import { SHORT_ABILITY_CYCLE, abilityCycle } from "./abilities";
import {
  TRAP_AND_CURSE_BOARD,
  activate,
  cards,
  expectRuleError,
  hasEvent,
  newGame,
  playerOf,
  readyAbility,
  roll,
  send,
  turnsAbilityReady,
  withPlayer,
} from "./testing";
import type { GameState, Player } from "./types";

const aria = (state: GameState) => playerOf(state, "p1");
const answer = (state: GameState, use: boolean) => send(state, { type: "answerWard", playerId: "p1", use });
/** Charged, one step before the trap at 12. */
const onTheWay = (patch: Partial<Player> = {}) =>
  withPlayer(readyAbility(newGame(TRAP_AND_CURSE_BOARD, { p1: "trapWard" }), "p1"), "p1", {
    position: 11,
    energy: 3,
    ...patch,
  });

describe("Trap Ward", () => {
  it("can't be used on its own: it answers traps", () => {
    expectRuleError(() => activate(onTheWay(), "p1"), "ABILITY_REACTIVE");
  });

  it("takes two turns to charge, counting the first", () => {
    const { readyAt } = turnsAbilityReady(newGame(TRAP_AND_CURSE_BOARD, { p1: "trapWard" }), "p1", 8);
    expect(readyAt).toEqual([SHORT_ABILITY_CYCLE]);
    expect(abilityCycle("trapWard")).toBe(2);
  });

  it("asks before a trap strikes, and holds the turn until answered", () => {
    const { state, events } = roll(onTheWay(), "p1", 1);
    expect(events).toContainEqual({ type: "wardOffered", playerId: "p1", tile: 12, threat: "trap" });
    expect(state.pendingWard).toMatchObject({ playerId: "p1", tile: 12, endsTurn: true });
    expect(aria(state).position).toBe(12);
    expectRuleError(() => roll(state, "p1", 1), "WARD_PENDING");
  });

  describe("used", () => {
    it("keeps the trap off and empties the charge", () => {
      const { state, events } = answer(roll(onTheWay(), "p1", 1).state, true);
      expect(events).toContainEqual({ type: "trapBlocked", playerId: "p1", tile: 12, ward: "ability", hidden: false });
      expect(aria(state)).toMatchObject({ position: 12, energy: 3, abilityCharge: 1 });
      expect(state.pendingWard).toBeNull();
    });

    it("smashes the trap for good: the tile never strikes again", () => {
      const { state: smashed, events } = answer(roll(onTheWay(), "p1", 1).state, true);
      expect(events).toContainEqual({ type: "trapDestroyed", playerId: "p1", tile: 12, hidden: false });
      expect(smashed.destroyedTraps).toEqual([12]);

      let state = smashed;
      for (let turn = 0; turn < 4; turn++) {
        const next = roll(withPlayer(state, "p1", { position: 11, abilityCharge: 0 }), "p1", 1);
        expect(aria(next.state).position).toBe(12);
        expect(hasEvent(next.events, "wardOffered", "trapTriggered")).toBe(false);
        state = next.state;
      }
    });

    it("on a hidden trap, takes it off the board for good", () => {
      const zoned = newGame({ size: 40, effects: {}, trapZones: [{ from: 10, to: 13, traps: 1 }] }, { p1: "trapWard" });
      const trap = zoned.hiddenTraps[0];
      const beforeTrap = withPlayer(readyAbility(zoned, "p1"), "p1", { position: trap - 1 });
      const smashed = answer(roll(beforeTrap, "p1", 1).state, true).state;
      expect(smashed.hiddenTraps).toEqual([]);
      expect(smashed.destroyedTraps).toEqual([trap]);
    });

    it("on a curse, wards it off but leaves it in place", () => {
      const { state } = roll(onTheWay({ position: 19 }), "p1", 1);
      expect(answer(state, true).state.destroyedTraps).toEqual([]);
    });
  });

  it("declined, lets the trap strike and stays charged", () => {
    const { state } = answer(roll(onTheWay(), "p1", 1).state, false);
    expect(aria(state)).toMatchObject({ position: 8, energy: 1, abilityCharge: SHORT_ABILITY_CYCLE });
  });

  describe("with the Arcane Shield up", () => {
    it("is still offered, and keeps the shield when used", () => {
      const { state, events } = roll(onTheWay({ shielded: true }), "p1", 1);
      expect(events).toContainEqual({ type: "wardOffered", playerId: "p1", tile: 12, threat: "trap" });
      expect(aria(answer(state, true).state)).toMatchObject({ position: 12, shielded: true, abilityCharge: 1 });
    });

    it("declined, lets the shield take the trap and stays charged", () => {
      const { state } = answer(roll(onTheWay({ shielded: true }), "p1", 1).state, false);
      expect(aria(state)).toMatchObject({ position: 12, shielded: false, abilityCharge: SHORT_ABILITY_CYCLE });
      expect(state.destroyedTraps).toEqual([]);
    });

    it("is offered for curses too, which the shield doesn't stop", () => {
      const { state } = roll(onTheWay({ position: 19, shielded: true, hand: cards("windStep") }), "p1", 1);
      expect(state.pendingWard?.threat).toBe("curse");
      expect(aria(answer(state, true).state).hand).toHaveLength(1);
    });
  });
});
