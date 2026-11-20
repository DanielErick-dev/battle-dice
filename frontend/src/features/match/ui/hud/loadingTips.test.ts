import { describe, expect, it } from "vitest";
import { CHARACTER_GUIDES } from "@/features/characters/guide";
import { GENERAL_TIPS, loadingTips } from "./loadingTips";

describe("the loading curtain's tips", () => {
  it("covers the playing characters' tips and the general rules, each once", () => {
    const tips = loadingTips(["kage", "fairy", "kage"]);
    const expected = [...CHARACTER_GUIDES.kage.tips, ...CHARACTER_GUIDES.fairy.tips, ...GENERAL_TIPS];
    expect(tips).toHaveLength(expected.length);
    expect(new Set(tips)).toEqual(new Set(expected));
  });

  it("keeps the same order for the same seed", () => {
    expect(loadingTips(["zarek"], 3)).toEqual(loadingTips(["zarek"], 3));
  });
});
