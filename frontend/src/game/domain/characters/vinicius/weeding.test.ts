import { describe, expect, it } from "vitest";
import { abilityBlocker } from "../../abilities/ability";
import type { BoardDefinition } from "../../board/board";
import { eventsOfType, newGame, onTurnOf, playerOf, roll, withPlayer } from "../../testing";

/** A trap at 10 (back to 4) on a plain path. */
const BOARD: BoardDefinition = { size: 60, effects: { 10: { kind: "trap", to: 4 } } };

const duel = () => newGame(BOARD, { vinicius: "weeding", rival: "doubleCast" });

describe("Weeding", () => {
  it("hoes out a trap he stops on: he stays put and it's gone for good", () => {
    const { state, events } = roll(withPlayer(duel(), "vinicius", { position: 4 }), "vinicius", 6);
    expect(playerOf(state, "vinicius").position).toBe(10);
    expect(state.destroyedTraps).toContain(10);
    expect(eventsOfType(events, "trapWeeded")).toEqual([
      { type: "trapWeeded", playerId: "vinicius", tile: 10, hidden: false },
    ]);
    expect(eventsOfType(events, "trapTriggered")).toEqual([]);
  });

  it("leaves the tile harmless for whoever comes after", () => {
    const weeded = roll(withPlayer(duel(), "vinicius", { position: 4 }), "vinicius", 6).state;
    const { state } = roll(onTurnOf(withPlayer(weeded, "rival", { position: 4 }), "rival"), "rival", 6);
    expect(playerOf(state, "rival").position).toBe(10);
  });

  it("is passive: never charges and has nothing to press", () => {
    const state = roll(duel(), "vinicius", 1).state;
    expect(playerOf(state, "vinicius").abilityCharge).toBe(0);
    expect(abilityBlocker(playerOf(state, "vinicius"))).toBe("ABILITY_REACTIVE");
  });
});
