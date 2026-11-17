import { describe, expect, it } from "vitest";
import { corruptedSlots } from "./CorruptedCard";

describe("corruptedSlots", () => {
  it("spreads the corrupted cards through the hand", () => {
    expect(corruptedSlots(6, 2)).toEqual([2, 4]);
  });

  it("puts them on top of an empty hand", () => {
    expect(corruptedSlots(0, 2)).toEqual([-1, -1]);
  });

  it("keeps them after a real card when the hand is small", () => {
    expect(corruptedSlots(1, 3)).toEqual([0, 0, 0]);
  });
});
