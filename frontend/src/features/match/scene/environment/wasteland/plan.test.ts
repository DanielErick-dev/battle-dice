import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { trailNearest } from "../shared/trailPlan";
import { WRECKS } from "./catalog";
import { planWasteland } from "./plan";

describe("the wasteland", () => {
  const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);
  const { pieces, wrecks, fires } = planWasteland(layout.trail);

  it("leaves wrecks by the road, ruins round the edge and fires burning", () => {
    expect(wrecks.length).toBeGreaterThan(5);
    expect(pieces.filter(({ piece }) => piece.startsWith("wall")).length).toBeGreaterThan(5);
    expect(fires.length).toBeGreaterThan(0);
  });

  it("parks only cars and trucks by the road, just off it", () => {
    for (const { piece, x, z } of wrecks) {
      expect(WRECKS).toContain(piece);
      const { distance } = trailNearest(layout.trail, x, z);
      expect(distance).toBeGreaterThanOrEqual(2.4);
      expect(distance).toBeLessThanOrEqual(3.6);
    }
  });

  it("comes out the same every time", () => {
    expect(planWasteland(layout.trail)).toEqual(planWasteland(layout.trail));
  });
});
