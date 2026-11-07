import { describe, expect, it } from "vitest";
import { arcHeight, chunkLayout, DUST, dustVelocities, spikeLayout } from "./frostSlamLayout";

describe("Bjorn's frost slam", () => {
  it("lays out the same spikes, dust and chunks every time", () => {
    expect(spikeLayout()).toEqual(spikeLayout());
    expect(chunkLayout()).toEqual(chunkLayout());
    expect(dustVelocities()).toHaveLength(DUST);
  });

  it("raises the spikes nearest the blow first", () => {
    const spikes = spikeLayout();
    const nearest = spikes.reduce((best, spike) => (spike.ring < best.ring ? spike : best));
    expect(Math.min(...spikes.map(({ delay }) => delay))).toBe(nearest.delay);
  });

  it("throws things up in an arc that comes back to rest on the floor", () => {
    expect(arcHeight(2, 0, 4)).toBe(0);
    expect(arcHeight(2, 0.5, 4)).toBeCloseTo(0.5);
    expect(arcHeight(2, 5, 4)).toBe(0);
  });
});
