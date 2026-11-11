import { describe, expect, it } from "vitest";
import { gateStrength, gateWidth } from "./timeline";

describe("the realm gate's timeline", () => {
  it("opens, holds and closes", () => {
    expect(gateStrength(0)).toBe(0);
    expect(gateStrength(0.225)).toBeCloseTo(0.5);
    expect(gateStrength(1)).toBe(1);
    expect(gateStrength(2.6)).toBeCloseTo(0.5);
    expect(gateStrength(3.5)).toBe(0);
  });

  it("widens from a fifth while opening and stays full", () => {
    expect(gateWidth(0)).toBeCloseTo(0.2);
    expect(gateWidth(0.45)).toBe(1);
    expect(gateWidth(5)).toBe(1);
  });
});
