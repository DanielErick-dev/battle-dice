import { describe, expect, it } from "vitest";
import { ARROW_RAIN_PUSH } from "./arrowRain";
import { LONG_ABILITY_CYCLE, abilityCycle } from "../../abilities/charge";
import { TRAP_AND_CURSE_BOARD } from "../../testing/boards";
import {
  activate,
  expectRuleError,
  hasEvent,
  newGame,
  playerOf,
  readyAbility,
  roll,
  withPlayer,
  withPlayers,
} from "../../testing";
import type { GameState } from "../../core/state";

const aria = (state: GameState) => playerOf(state, "p1");
const solo = () => newGame(TRAP_AND_CURSE_BOARD, { p1: "arrowRain" });
/** Alone on tile 10, charged, shooting at the traps ahead. */
const aiming = (patch: Partial<GameState> = {}) =>
  activate({ ...withPlayer(readyAbility(solo(), "p1"), "p1", { position: 10, energy: 3 }), ...patch }, "p1");
/** The archer on 10 with opponents on 30 and 3. */
const table = () =>
  withPlayers(newGame(TRAP_AND_CURSE_BOARD, { p1: "arrowRain", p2: null, p3: null }), {
    p1: { position: 10, abilityCharge: LONG_ABILITY_CYCLE },
    p2: { position: 30, abilityCharge: 0 },
    p3: { position: 3, abilityCharge: 0 },
  });
const positions = (state: GameState) => state.players.map((player) => player.position);

describe("Arrow Rain", () => {
  it("charges over the long cycle", () => {
    expect(abilityCycle("arrowRain")).toBe(LONG_ABILITY_CYCLE);
  });

  describe("aimed at the traps", () => {
    it("alone, pins down the next three threats ahead, hidden traps and curses included", () => {
      const { state, events } = aiming({ hiddenTraps: [15] });
      expect(state.pinnedTraps).toEqual([12, 15, 20]);
      expect(events).toContainEqual({
        type: "arrowsLoosed",
        playerId: "p1",
        targets: [12, 15, 20],
        pinned: [12, 15, 20],
        hidden: [15],
      });
    });

    it("leaves a pinned trap harmless to land on, then frees it", () => {
      const { state, events } = roll(aiming().state, "p1", 2);
      expect(aria(state)).toMatchObject({ position: 12, energy: 3 });
      expect(hasEvent(events, "trapTriggered", "wardOffered")).toBe(false);
      expect(events).toContainEqual({ type: "trapUnpinned", tile: 12 });
      expect(state.pinnedTraps).toEqual([20]);
    });

    it("frees the traps walked past, which strike again from then on", () => {
      const passed = roll(aiming({ hiddenTraps: [15] }).state, "p1", 6).state;
      expect(aria(passed).position).toBe(16);
      expect(passed.pinnedTraps).toEqual([20]);
      expect(aria(roll(withPlayer(passed, "p1", { position: 11 }), "p1", 1).state).position).toBe(8);
    });

    it("keeps a pinned hidden trap from springing", () => {
      const { state, events } = roll(aiming({ hiddenTraps: [11] }).state, "p1", 1);
      expect(aria(state).position).toBe(11);
      expect(hasEvent(events, "hiddenTrapSprung")).toBe(false);
    });

    it("with opponents about but aimed at nobody, pins the traps ahead", () => {
      const { state } = activate(table(), "p1");
      expect(positions(state)).toEqual([10, 30, 3]);
      expect(state.pinnedTraps.length).toBeGreaterThan(0);
    });
  });

  describe("aimed at the opponents", () => {
    it("knocks every one of them back instead of pinning traps", () => {
      const { state, events } = activate(table(), "p1", { volley: "opponents" });
      expect(positions(state)).toEqual([10, 30 - ARROW_RAIN_PUSH, 1]);
      expect(state.pinnedTraps).toEqual([]);
      expect(events).toContainEqual({ type: "arrowsLoosed", playerId: "p1", targets: [30, 3], pinned: [], hidden: [] });
      expect(events.filter((event) => event.type === "playerPushed")).toHaveLength(2);
    });

    it("can't be done with none in reach", () => {
      expectRuleError(() => activate(readyAbility(solo(), "p1"), "p1", { volley: "opponents" }), "INVALID_TARGET");
    });
  });
});
