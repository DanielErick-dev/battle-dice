import { describe, expect, it } from "vitest";
import { DEFAULT_TIMINGS } from "../../../config";
import { TIPPED, verdictFrame, verdictGlow } from "./verdictTimeline";

describe("the Silent Verdict's scale", () => {
  it("comes down from the sky and fades in", () => {
    expect(verdictFrame(0, null)).toMatchObject({ opacity: 0, drop: 4 });
    expect(verdictFrame(1, null)).toMatchObject({ opacity: 1, drop: 0 });
  });

  it("swings while weighing, the swing dying away", () => {
    const early = Math.abs(verdictFrame(0.3, null).angle);
    const late = Math.abs(verdictFrame(0.3 + (2 * Math.PI) / 5.5, null).angle);
    expect(early).toBeGreaterThan(late);
    expect(verdictFrame(1, null).struck).toBe(-1);
  });

  it("tips onto the attacker's side and strikes them", () => {
    const tipped = verdictFrame(10, 9);
    expect(tipped.angle).toBeCloseTo(TIPPED, 2);
    expect(tipped.struck).toBeCloseTo(0.65);
    expect(verdictGlow(tipped)).toBeGreaterThan(0);
  });

  it("fades out once the strike has lingered", () => {
    const end = DEFAULT_TIMINGS.verdictTipMs / 1000 + 0.5 + 0.8;
    expect(verdictFrame(5 + end, 5).opacity).toBeCloseTo(0);
  });

  it("glows half-lit while weighing, and flashes at the strike", () => {
    expect(verdictGlow({ opacity: 1, drop: 0, angle: 0, struck: -1 })).toBe(0.5);
    expect(verdictGlow({ opacity: 1, drop: 0, angle: 0, struck: 0.01 })).toBeGreaterThan(0.9);
  });
});
