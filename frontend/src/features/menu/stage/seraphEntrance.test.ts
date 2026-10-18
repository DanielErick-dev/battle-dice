import { describe, expect, it } from "vitest";
import { DESCENT_SECONDS } from "@/features/match/scene/character/HeavenDescent";
import { ENTRANCE_SECONDS, GUSTS, gustAt, wingStroke } from "./seraphEntrance";

describe("Seraphiel's entrance", () => {
  it("stirs the wind with every beat on the way down, from the start, stronger near the ground", () => {
    expect(GUSTS.length).toBeGreaterThan(4);
    expect(GUSTS[0].at).toBeLessThan(0.5);
    // Beating down hardest on each.
    for (const { at } of GUSTS) expect(wingStroke(at)).toBeCloseTo(0, 5);
    expect(GUSTS.at(-1)!.strength).toBeGreaterThan(GUSTS[0].strength);
  });

  it("raises no wind once landed, and lets the wings beat on their own", () => {
    expect(GUSTS.every(({ at }) => at < DESCENT_SECONDS)).toBe(true);
    expect(gustAt(DESCENT_SECONDS + 2)).toBeLessThan(0.05);
    expect(wingStroke(ENTRANCE_SECONDS)).toBeNull();
  });
});
