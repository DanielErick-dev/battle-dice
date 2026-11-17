import { describe, expect, it } from "vitest";
import { closeSlabGaps, warpOntoSlab } from "./pathSlab";

// A slab running along +x: back at x = -1, front at x = 1, its right side towards +z.
const ALONG_X = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
] as const;
const EXTENT = { width: 2, depth: 4 };

describe("warpOntoSlab", () => {
  it("lays the model's corners on the slab's corners", () => {
    // Back right (x right edge = -width/2, z back = -depth/2) and front left.
    const positions = [-1, 0, -2, 1, 1, 2];
    const { positions: warped } = warpOntoSlab(positions, [0, 1, 0, 0, 1, 0], EXTENT, ALONG_X, -0.5, 2);
    expect([...warped].map((value) => Math.round(value * 100) / 100)).toEqual([-1, -0.5, 1, 1, 1.5, -1]);
  });

  it("turns normals with the way: the model's +z faces the front", () => {
    const { normals } = warpOntoSlab([0, 0, 0], [0, 0, 1], EXTENT, ALONG_X, 0, 1);
    expect(normals[0]).toBeCloseTo(1);
    expect(normals[2]).toBeCloseTo(0);
  });

  it("points a zero normal straight up instead of going NaN", () => {
    const { normals } = warpOntoSlab([0, 0, 0], [0, 0, 0], EXTENT, ALONG_X, 0, 1);
    expect([...normals]).toEqual([0, 1, 0]);
  });
});

describe("closeSlabGaps", () => {
  it("pushes both ends out by half the gap, so neighbours meet", () => {
    const closed = closeSlabGaps(ALONG_X, 0.4);
    expect(closed.map(([x, z]) => [Math.round(x * 100) / 100, z])).toEqual([
      [-1.2, 1],
      [1.2, 1],
      [1.2, -1],
      [-1.2, -1],
    ]);
  });
});
