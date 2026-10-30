import { describe, expect, it } from "vitest";
import { circlingAt, clamp, cycle, fadeAtEnds, fall, flameScale, flicker, rise, spike, wave } from "./motion";

describe("wave", () => {
  it("swings by its amplitude about zero", () => {
    expect(wave(0, 0.3, 2)).toBe(0);
    expect(wave(Math.PI / 4, 0.3, 2)).toBeCloseTo(0.3);
    expect(wave(0, 0.3, 2, -Math.PI / 2)).toBeCloseTo(-0.3);
  });
});

describe("spike", () => {
  it("is zero over the sine's lower half", () => {
    expect(spike(3 * (Math.PI / 2), 1, 0, 3)).toBe(0);
  });

  it("sharpens the upper half by its power", () => {
    expect(spike(Math.PI / 6, 1, 0, 2)).toBeCloseTo(0.25);
  });
});

describe("cycle", () => {
  it("wraps every 1 / rate seconds", () => {
    expect(cycle(1.25, 1)).toBeCloseTo(0.25);
    expect(cycle(2.5, 0.5)).toBeCloseTo(0.25);
  });

  it("staggers by its offset", () => {
    expect(cycle(0, 1, 0.75)).toBeCloseTo(0.75);
    expect(cycle(0.5, 1, 0.75)).toBeCloseTo(0.25);
  });
});

describe("flicker", () => {
  const candle = { slow: [0.1, 1], fast: [0.05, 2] } as const;

  it("stays about 1, within the waves' amplitudes", () => {
    for (let t = 0; t < 10; t += 0.37) {
      const size = flicker(t, candle);
      expect(size).toBeGreaterThanOrEqual(0.85);
      expect(size).toBeLessThanOrEqual(1.15);
    }
  });

  it("is out of step with a neighbour given another phase", () => {
    expect(flicker(1, candle, 2.1, 1)).not.toBeCloseTo(flicker(1, candle));
  });
});

describe("flameScale", () => {
  it("stretches a candle taller as it narrows", () => {
    expect(flameScale({ kind: "stretch", width: 0.1, height: 0.2 }, 0.8)).toEqual([0.1 * 0.8, 0.2 * 1.2, 1]);
  });

  it("grows both sides together", () => {
    expect(flameScale({ kind: "grow", width: 0.1, height: 0.2 }, 1.5)).toEqual([0.1 * 1.5, 0.2 * 1.5, 1]);
  });

  it("swells every axis of a haze", () => {
    expect(flameScale({ kind: "uniform", size: 0.4 }, 0.5)).toEqual([0.2, 0.2, 0.2]);
  });
});

describe("rise and fall", () => {
  it("climb and sink by their step", () => {
    expect(rise(0.5, 0.2, 2)).toBeCloseTo(0.7);
    expect(fall(0.5, 0.2, 2)).toBeCloseTo(0.3);
  });

  it("start over at the other end, keeping the overshoot", () => {
    expect(rise(1.9, 0.3, 2)).toBeCloseTo(0.2);
    expect(fall(0.1, 0.3, 2)).toBeCloseTo(1.8);
  });
});

describe("fadeAtEnds", () => {
  it("is full in the middle of the climb", () => {
    expect(fadeAtEnds(1, 2, 4, 2)).toBe(1);
  });

  it("fades in at the bottom and out at the top", () => {
    expect(fadeAtEnds(0.1, 2, 4, 2)).toBeCloseTo(0.4);
    expect(fadeAtEnds(1.9, 2, 4, 2)).toBeCloseTo(0.2);
  });
});

describe("clamp", () => {
  it("keeps a value within its bounds", () => {
    expect(clamp(-2, -0.8, 0.8)).toBe(-0.8);
    expect(clamp(0.3, -0.8, 0.8)).toBe(0.3);
    expect(clamp(5, -0.8, 0.8)).toBe(0.8);
  });
});

describe("circlingAt", () => {
  it("starts at its angle and turns at its speed", () => {
    const [x, z] = circlingAt({ angle: 0, radius: 0.5, speed: Math.PI / 2 }, 1);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(0.5);
  });
});
