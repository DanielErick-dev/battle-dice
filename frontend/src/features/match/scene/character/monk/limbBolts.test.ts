import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { resample } from "./limbBolts";

describe("a limb's lightning trail", () => {
  const points = () => Array.from({ length: 5 }, () => new Vector3());

  it("draws nothing while the limb barely moves", () => {
    expect(resample([new Vector3(), new Vector3(0.01, 0, 0)], points(), 0.05)).toBe(false);
    expect(resample([new Vector3()], points(), 0)).toBe(false);
  });

  it("spreads the bolt evenly along the path the limb took", () => {
    const out = points();
    const trail = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 1, 0)];
    expect(resample(trail, out, 0.05)).toBe(true);
    expect(out.map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [0.5, 0],
      [1, 0],
      [1, 0.5],
      [1, 1],
    ]);
  });
});
