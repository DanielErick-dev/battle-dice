import { describe, expect, it } from "vitest";
import { seededRandom } from "@/game/domain/core/random";
import { evenAngles, scatterAround } from "./geometry";
import { petalPose, settle, type Petal } from "./petals";

describe("scatterAround", () => {
  const spots = scatterAround(seededRandom(5), 40, 0.3, 0.9);

  it("places as many as asked within the ring", () => {
    expect(spots).toHaveLength(40);
    for (const [x, z] of spots) {
      const radius = Math.hypot(x, z);
      expect(radius).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(radius).toBeLessThanOrEqual(0.9 + 1e-9);
    }
  });

  it("keeps the camera's view of the feet and the stage's sides clear", () => {
    for (const [x, z] of spots) {
      expect(z > 0 && Math.abs(x) < 0.32).toBe(false);
      expect(Math.abs(x)).toBeLessThanOrEqual(0.85);
    }
  });

  it("is the same for the same seed", () => {
    expect(scatterAround(seededRandom(5), 40, 0.3, 0.9)).toEqual(spots);
  });
});

describe("evenAngles", () => {
  it("spaces angles round a full turn from the start", () => {
    const angles = evenAngles(4, 0.3);
    expect(angles).toHaveLength(4);
    expect(angles[0]).toBe(0.3);
    expect(angles[2] - angles[1]).toBeCloseTo(Math.PI / 2);
  });
});

describe("falling petals", () => {
  const petal = (): Petal => ({
    x: 0.2,
    z: -0.4,
    height: 0.05,
    speed: 0.1,
    phase: 1,
    spin: 2,
    flutter: { rate: 1.5, phase: 1 },
  });

  it("sink by their speed and start again at the top", () => {
    const sinking = petal();
    settle(sinking, 0.25, 1.5);
    expect(sinking.height).toBeCloseTo(0.025);
    settle(sinking, 0.5, 1.5);
    expect(sinking.height).toBeCloseTo(1.475);
  });

  it("sway round their own column and stay at their height", () => {
    const { position } = petalPose(petal(), 3);
    expect(Math.abs(position[0] - 0.2)).toBeLessThanOrEqual(0.12);
    expect(position[1]).toBe(0.05);
    expect(Math.abs(position[2] + 0.4)).toBeLessThanOrEqual(0.06);
  });
});
