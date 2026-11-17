import { describe, expect, it } from "vitest";
import { Color } from "three";
import { faceColor } from "./ground";
import { WATER_LEVEL } from "./terrain";

const flat = { x: 3, z: 7, height: 0.5, upright: 1 };
const luminance = (color: Color) => color.r + color.g + color.b;

describe("the island ground's colours", () => {
  it("bare a steep grassy slope down to stone", () => {
    const level = faceColor("grass", flat, new Color());
    const steep = faceColor("grass", { ...flat, upright: 0.5 }, new Color());
    expect(steep.g / luminance(steep)).toBeLessThan(level.g / luminance(level));
  });

  it("darken the sand the waves wash over", () => {
    const dry = faceColor("sand", { ...flat, height: WATER_LEVEL + 0.6 }, new Color());
    const wet = faceColor("sand", { ...flat, height: WATER_LEVEL + 0.02 }, new Color());
    expect(luminance(wet)).toBeLessThan(luminance(dry));
  });

  it("vary the grass from place to place", () => {
    const colours = new Set(
      Array.from({ length: 40 }, (_, index) =>
        faceColor("grass", { ...flat, x: index * 5 }, new Color()).getHexString(),
      ),
    );
    expect(colours.size).toBeGreaterThan(20);
  });
});
