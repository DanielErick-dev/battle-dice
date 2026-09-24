import { describe, expect, it } from "vitest";
import { generateBoard, type BoardRecipe } from "./boardGenerator";

const RECIPE: BoardRecipe = {
  size: 200,
  seed: 42,
  density: { portal: 6, trap: 9, advance: 8, extraTurn: 4, skipTurn: 4, card: 12 },
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
});
