import { describe, expect, it } from "vitest";
import { approach, approachLinear, clamp01, easeOutBack, easeOutCubic, growOrFade, ramp, smoothstep } from "./easing";

describe("easing", () => {
  it("curves start at 0 and end at 1", () => {
    for (const curve of [smoothstep, easeOutCubic, easeOutBack]) {
      expect(curve(0)).toBeCloseTo(0);
      expect(curve(1)).toBeCloseTo(1);
    }
    expect(Math.max(...Array.from({ length: 11 }, (_, i) => easeOutBack(i / 10)))).toBeGreaterThan(1);
  });

  it("ramps and clamps the clock into 0–1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(ramp(1.5, 1, 1)).toBeCloseTo(0.5);
    expect(ramp(9, 1, 1)).toBe(1);
  });

  it("approaches the same way however the time is sliced into frames", () => {
    const once = approach(0, 1, 3, 0.5);
    let sliced = 0;
    for (let frame = 0; frame < 5; frame++) sliced = approach(sliced, 1, 3, 0.1);
    expect(sliced).toBeCloseTo(once);
    expect(approachLinear(0, 10, 2, 1)).toBe(10);
  });

  it("grows while on and fades once off, at their own rates", () => {
    expect(growOrFade(0, true, 10, 1, 0.1)).toBeGreaterThan(growOrFade(1, false, 10, 1, 0.1) - 0.5);
    expect(growOrFade(1, false, 10, 1, 0.1)).toBeLessThan(1);
  });
});
