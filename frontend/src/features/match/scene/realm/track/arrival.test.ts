import { describe, expect, it } from "vitest";
import { stepPresence, tileArrival, wallRise } from "./arrival";

describe("a realm track's arrival", () => {
  it("eases its presence in while open and out once closed, never overshooting", () => {
    expect(stepPresence(0, true, 0.1)).toBeCloseTo(0.24);
    expect(stepPresence(1, false, 0.1)).toBeCloseTo(1 - 0.21);
    expect(stepPresence(0.5, true, 10)).toBe(1);
    expect(stepPresence(0.5, false, 10)).toBe(0);
  });

  it("brings the tiles in one after another from the portal", () => {
    expect(tileArrival(0, 0, 6)).toBe(0);
    expect(tileArrival(0.2, 0, 6)).toBeGreaterThan(tileArrival(0.2, 1, 6));
    expect(tileArrival(0.2, 5, 6)).toBe(0);
    expect(tileArrival(1, 5, 6)).toBe(1);
  });

  it("raises the walls ahead of the tiles and never scales them to zero", () => {
    expect(wallRise(0)).toBe(0.001);
    expect(wallRise(1 / 1.2)).toBe(1);
    expect(wallRise(0.4)).toBeGreaterThan(0.4);
  });
});
