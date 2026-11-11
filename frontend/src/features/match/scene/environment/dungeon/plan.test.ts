import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { trailNearest } from "../shared/trailPlan";
import { planDungeon } from "./plan";

describe("the dungeon", () => {
  const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);

  it("walls the hall on three sides and lights torches", () => {
    const { pieces, flames } = planDungeon(layout.trail);
    expect(pieces.filter(({ piece }) => piece.startsWith("wall")).length).toBeGreaterThan(10);
    expect(flames.length).toBeGreaterThan(5);
  });

  it("keeps the furnishings off the trail", () => {
    const furnishings = planDungeon(layout.trail).pieces.filter(
      ({ piece }) => !piece.startsWith("wall") && !piece.startsWith("torch") && !piece.startsWith("banner"),
    );
    expect(furnishings.length).toBeGreaterThan(0);
    for (const { piece, x, z } of furnishings) {
      expect(trailNearest(layout.trail, x, z).distance, piece).toBeGreaterThan(2);
    }
  });

  it("comes out the same every time", () => {
    expect(planDungeon(layout.trail)).toEqual(planDungeon(layout.trail));
  });
});
