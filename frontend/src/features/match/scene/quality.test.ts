import { describe, expect, it } from "vitest";
import { firstStep, QUALITY_STEPS, stepQuality } from "./quality";

describe("adaptive rendering quality", () => {
  it("drops one rung at a time and stops at the cheapest", () => {
    let step = firstStep("high");
    for (let drop = 0; drop < 10; drop++) step = stepQuality(step, 1, "high");
    expect(step).toBe(QUALITY_STEPS.length - 1);
  });

  it("climbs back, but never above what the chosen quality allows", () => {
    expect(stepQuality(2, -1, "high")).toBe(1);
    expect(stepQuality(0, -1, "high")).toBe(0);
    expect(stepQuality(QUALITY_STEPS.length - 1, -1, "low")).toBe(QUALITY_STEPS.length - 1);
  });

  it("gets cheaper down the rungs", () => {
    QUALITY_STEPS.slice(1).forEach((rung, index) => {
      const before = QUALITY_STEPS[index]!;
      expect(rung.multisampling).toBeLessThanOrEqual(before.multisampling);
      expect(rung.bloomLevels).toBeLessThanOrEqual(before.bloomLevels);
    });
  });
});
