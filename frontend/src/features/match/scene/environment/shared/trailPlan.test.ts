import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { clearOfStart, footprint, hidesTiles, isFree, pickWeighted, trailBounds, trailNearest } from "./trailPlan";

// An L: three tiles along x, then two towards the camera (+z).
const trail: Vec3[] = [
  [0, 0, 0],
  [2, 0, 0],
  [4, 0, 0],
  [4, 0, 2],
  [4, 0, 4],
];

describe("planning round the trail", () => {
  it("grows the trail's extent by the margins", () => {
    expect(trailBounds(trail, { side: 1, back: 2, front: 3 })).toEqual({ minX: -1, maxX: 5, minZ: -2, maxZ: 7 });
  });

  it("measures the distance to the nearest step and its direction", () => {
    expect(trailNearest(trail, 2, -3)).toEqual({ distance: 3, dx: 2, dz: 0 });
    expect(trailNearest(trail, 6, 3)).toEqual({ distance: 2, dx: 0, dz: 2 });
  });

  it("sees a tall thing in front of the trail hiding tiles, but not one behind it or far aside", () => {
    expect(hidesTiles(trail, 2, 1.5, 3, 0.5)).toBe(true);
    expect(hidesTiles(trail, 2, -3, 3, 0.5)).toBe(false);
    expect(hidesTiles(trail, 12, 1.5, 3, 0.5)).toBe(false);
    expect(hidesTiles(trail, 2, 6, 1, 0.5)).toBe(false);
  });

  it("keeps the start's plaza clear", () => {
    expect(clearOfStart(trail, 0.5, 0, 0.2)).toBe(false);
    expect(clearOfStart(trail, -20, 0, 0.2)).toBe(true);
  });

  it("keeps pieces apart by their reach and a gap", () => {
    const blockers = [{ x: 0, z: 0, radius: 1 }];
    expect(isFree(blockers, 2, 0, 0.5, 0.3)).toBe(true);
    expect(isFree(blockers, 1.7, 0, 0.5, 0.3)).toBe(false);
  });

  it("measures a footprint by the wider side", () => {
    expect(footprint([2, 9, 4], 1.5)).toBe(3);
  });

  it("picks by weight with a single roll", () => {
    const entries: [string, number][] = [
      ["rare", 1],
      ["common", 3],
    ];
    expect(pickWeighted(entries, () => 0.1)?.[0]).toBe("rare");
    expect(pickWeighted(entries, () => 0.5)?.[0]).toBe("common");
    expect(pickWeighted([], () => 0.5)).toBeUndefined();
  });
});
