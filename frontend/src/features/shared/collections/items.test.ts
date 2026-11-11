import { describe, expect, it } from "vitest";
import { cycle, itemAt, pick } from "./items";

describe("itemAt", () => {
  it("returns the item and throws on a miss", () => {
    expect(itemAt(["a", "b"], 1)).toBe("b");
    expect(() => itemAt(["a"], 1)).toThrow(RangeError);
    expect(() => itemAt([], 0)).toThrow(RangeError);
  });
});

describe("cycle", () => {
  it("wraps past the end and below zero", () => {
    const items = ["a", "b", "c"];
    expect(cycle(items, 4)).toBe("b");
    expect(cycle(items, -1)).toBe("c");
  });

  it("throws on an empty list", () => {
    expect(() => cycle([], 0)).toThrow(RangeError);
  });
});

describe("pick", () => {
  it("maps a draw in [0, 1) to an item", () => {
    const items = ["a", "b", "c", "d"];
    expect(pick(items, 0)).toBe("a");
    expect(pick(items, 0.5)).toBe("c");
    expect(pick(items, 0.999)).toBe("d");
  });
});
