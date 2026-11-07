import { describe, expect, it, vi } from "vitest";
import { at } from "./invariant";
import { randomItem } from "./random";

describe("at", () => {
  it("returns the item, falsy ones included", () => {
    expect(at(["a", "b"], 1)).toBe("b");
    expect(at([0], 0)).toBe(0);
  });

  it("throws instead of returning undefined", () => {
    expect(() => at([1], 1)).toThrow(RangeError);
    expect(() => at([], 0)).toThrow(RangeError);
    expect(() => at([1], Number.NaN)).toThrow(RangeError);
  });
});

describe("randomItem", () => {
  it("maps [0, 1) across the items, drawing one number", () => {
    const random = vi.fn(() => 0.5);
    expect(randomItem(["a", "b", "c"], random)).toBe("b");
    expect(random).toHaveBeenCalledTimes(1);
    expect(randomItem(["a", "b", "c"], () => 0)).toBe("a");
    expect(randomItem(["a", "b", "c"], () => 0.99)).toBe("c");
  });

  it("throws on an empty list", () => {
    expect(() => randomItem([], () => 0)).toThrow(RangeError);
  });
});
