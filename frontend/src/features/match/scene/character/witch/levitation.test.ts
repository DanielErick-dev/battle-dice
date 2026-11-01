import { describe, expect, it } from "vitest";
import { levitationLift, RISE_SECONDS, stepLevitation } from "./levitation";

describe("levitating", () => {
  it("rises over RISE_SECONDS and comes down faster, staying within 0–1", () => {
    expect(stepLevitation(0, true, RISE_SECONDS / 2)).toBeCloseTo(0.5);
    expect(stepLevitation(0.9, true, 1)).toBe(1);
    expect(stepLevitation(1, false, 0.75)).toBeCloseTo(0.5);
    expect(stepLevitation(0.1, false, 1)).toBe(0);
  });

  it("lifts with a slow start and a soft arrival", () => {
    expect(levitationLift(0)).toBe(0);
    expect(levitationLift(0.5)).toBeCloseTo(0.5);
    expect(levitationLift(1)).toBe(1);
    expect(levitationLift(0.1)).toBeLessThan(0.1);
    expect(levitationLift(0.9)).toBeGreaterThan(0.9);
  });
});
