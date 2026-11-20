import { describe, expect, it } from "vitest";
import { chunked } from "./chunks";

describe("map chunks", () => {
  it("groups copies by the square they stand in, keeping every one", () => {
    const items = [
      { x: 1, z: 1 },
      { x: 15, z: 2 },
      { x: 17, z: 1 },
      { x: -1, z: 1 },
      { x: 3, z: 40 },
    ];
    const groups = chunked(items, 16);
    expect(groups.flat()).toHaveLength(items.length);
    expect(groups).toHaveLength(4);
    expect(groups.find((group) => group.includes(items[0]!))).toContain(items[1]);
  });
});
