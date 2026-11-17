import { describe, expect, it } from "vitest";
import { BROWNOUT_TURNS } from "@/game/domain/characters/alva/systems";
import type { Player } from "@/game/domain/types";
import { blackoutRoundsLeft, inversionRoundsLeft } from "./BoardSpells";

const withEmp = (emp: number) => ({ emp }) as Player;

describe("the board's spell tags", () => {
  it("count the Blackout down from its longest victim, and stop at the brownout", () => {
    expect(blackoutRoundsLeft([withEmp(BROWNOUT_TURNS + 2), withEmp(BROWNOUT_TURNS + 1), withEmp(0)])).toBe(2);
    expect(blackoutRoundsLeft([withEmp(BROWNOUT_TURNS)])).toBe(0);
  });

  it("count the Inversion as her badge does, one less on her own turn", () => {
    expect(inversionRoundsLeft({ owner: "a", turnsLeft: 3 }, "b")).toBe(3);
    expect(inversionRoundsLeft({ owner: "a", turnsLeft: 3 }, "a")).toBe(2);
    expect(inversionRoundsLeft(null, "a")).toBe(0);
  });
});
