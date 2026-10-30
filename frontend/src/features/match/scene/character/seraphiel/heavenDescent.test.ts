import { describe, expect, it } from "vitest";
import { DESCENT_SECONDS, descentHeight } from "./HeavenDescent";

describe("descentHeight", () => {
  it("starts high in the sky and lands exactly on the ground", () => {
    expect(descentHeight(0)).toBeGreaterThan(1);
    expect(descentHeight(DESCENT_SECONDS)).toBe(0);
    expect(descentHeight(DESCENT_SECONDS + 5)).toBe(0);
  });

  it("only ever comes down, slowing as it nears the ground", () => {
    const step = DESCENT_SECONDS / 10;
    const heights = Array.from({ length: 11 }, (_, index) => descentHeight(index * step));
    const drops = heights.slice(1).map((height, index) => heights[index] - height);
    drops.forEach((drop) => expect(drop).toBeGreaterThanOrEqual(0));
    expect(drops[0]).toBeGreaterThan(drops[drops.length - 1]);
  });
});
