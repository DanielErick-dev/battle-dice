import { describe, expect, it } from "vitest";
import { generateBoard, type BoardRecipe } from "./boardGenerator";

const RECIPE: BoardRecipe = {
  size: 200,
  seed: 42,
  density: {
    portal: 6,
    trap: 9,
    advance: 8,
    extraTurn: 4,
    skipTurn: 4,
    card: 12,
  },
};

describe("generateBoard", () => {
  it("builds the same board from the same seed", () => {
    expect(generateBoard(RECIPE)).toEqual(generateBoard(RECIPE));
    expect(generateBoard({ ...RECIPE, seed: 43 })).not.toEqual(generateBoard(RECIPE));
  });

  it("places roughly the requested amount of each effect", () => {
    const counts: Record<string, number> = {};
    for (const effect of Object.values(generateBoard(RECIPE).effects)) {
      counts[effect.kind] = (counts[effect.kind] ?? 0) + 1;
    }
    for (const [kind, perHundred] of Object.entries(RECIPE.density)) {
      const wanted = (perHundred * RECIPE.size) / 100;
      expect(counts[kind] ?? 0, kind).toBeGreaterThanOrEqual(wanted * 0.8);
      expect(counts[kind] ?? 0, kind).toBeLessThanOrEqual(wanted);
    }
  });

  it("curses some traps with each curse and leaves some plain", () => {
    const traps = Object.values(generateBoard(RECIPE).effects).filter((effect) => effect.kind === "trap");
    const curses = new Set(traps.map((trap) => trap.curse ?? "none"));
    expect(curses).toEqual(new Set(["discard", "drain", "none"]));
  });

  it("opens a realm on every portal, alternating infernal and celestial", () => {
    const portals = Object.entries(generateBoard(RECIPE).effects)
      .filter(([, effect]) => effect.kind === "portal")
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, effect]) => (effect.kind === "portal" ? effect.realm : undefined));
    expect(portals.length).toBeGreaterThan(2);
    portals.forEach((realm, index) => expect(realm).toBe(index % 2 === 0 ? "infernal" : "celestial"));
  });
});
