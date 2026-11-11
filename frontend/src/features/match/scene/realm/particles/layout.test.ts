import { describe, expect, it } from "vitest";
import { driftCloud, SHAFT_COUNT, shaftLayout } from "./layout";
import { itemAt } from "@/features/shared/collections/items";

describe("the realm particles' layout", () => {
  it("starts every particle inside the disc and between floor and ceiling", () => {
    const { positions, seeds } = driftCloud(7, 200, 10, -1, 14);
    expect(seeds).toHaveLength(200);
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = [itemAt(positions, i * 3), itemAt(positions, i * 3 + 1), itemAt(positions, i * 3 + 2)];
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(10 + 1e-4);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(14);
      expect(seeds[i]).toBeGreaterThanOrEqual(0);
      expect(seeds[i]).toBeLessThan(1);
    }
  });

  it("comes out the same for the same seed", () => {
    expect(driftCloud(13, 50, 8, 0, 5)).toEqual(driftCloud(13, 50, 8, 0, 5));
  });

  it("hangs the sunbeams high, round the arena within its radius", () => {
    const shafts = shaftLayout(20);
    expect(shafts).toHaveLength(SHAFT_COUNT);
    for (const { position, width } of shafts) {
      expect(position[1]).toBe(14);
      expect(Math.hypot(position[0], position[2])).toBeLessThanOrEqual(20 * 0.9 + 1e-9);
      expect(width).toBeGreaterThanOrEqual(1.8);
    }
  });
});
