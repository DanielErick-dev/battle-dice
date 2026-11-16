import { describe, expect, it } from "vitest";
import { POWER_FLICKER_SECONDS, POWER_OFF_SECONDS, POWER_RAMP_SECONDS, powerAt } from "./layout";

describe("powerAt", () => {
  it("stays off through the bowed hold, stutters, then climbs gradually to full", () => {
    expect(powerAt(0)).toBe(0);
    expect(powerAt(POWER_OFF_SECONDS - 0.01)).toBe(0);
    expect(powerAt(POWER_OFF_SECONDS + 0.01)).toBeGreaterThan(0);
    expect(powerAt(POWER_OFF_SECONDS + 0.12)).toBe(0);
    const midRamp = powerAt(POWER_OFF_SECONDS + POWER_FLICKER_SECONDS + POWER_RAMP_SECONDS / 2);
    expect(midRamp).toBeGreaterThan(0.4);
    expect(midRamp).toBeLessThan(1);
    expect(powerAt(POWER_OFF_SECONDS + POWER_FLICKER_SECONDS + POWER_RAMP_SECONDS)).toBe(1);
    expect(powerAt(60)).toBe(1);
  });
});
