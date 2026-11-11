import { describe, expect, it } from "vitest";
import { DICE_SIDES, diceFrom } from "./dice";
import { seededRandom } from "./random";

describe("diceFrom", () => {
  it("rolls every face from 1 to 6 and nothing else", () => {
    const roll = diceFrom(seededRandom(11));
    const faces = new Set(Array.from({ length: 600 }, roll));
    expect([...faces].sort()).toEqual(Array.from({ length: DICE_SIDES }, (_, i) => i + 1));
  });

  it("the same stream rolls the same dice", () => {
    const rolls = (seed: number) => Array.from({ length: 20 }, diceFrom(seededRandom(seed)));
    expect(rolls(3)).toEqual(rolls(3));
  });
});
