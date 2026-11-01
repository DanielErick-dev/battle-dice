import { describe, expect, it } from "vitest";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "./energy";
import { CARD_PORTAL_TRAP_BOARD } from "../testing/boards";
import { newGame, playerOf, roll, withPlayer } from "../testing";

const solo = () => newGame(CARD_PORTAL_TRAP_BOARD, { p1: null });

describe("energy", () => {
  it(`grows by one every ${TURNS_PER_ENERGY} turns of the player's`, () => {
    let state = solo();
    const start = playerOf(state, "p1").energy;
    state = roll(state, "p1", 1).state;
    expect(playerOf(state, "p1")).toMatchObject({ energy: start, energyCharge: 1 });

    state = roll(state, "p1", 1).state;
    expect(playerOf(state, "p1")).toMatchObject({ energy: start + 1, energyCharge: 0 });
  });

  it("never goes past the maximum", () => {
    const full = withPlayer(solo(), "p1", { energy: MAX_ENERGY, energyCharge: 1 });
    expect(playerOf(roll(full, "p1", 1).state, "p1").energy).toBe(MAX_ENERGY);
  });
});
