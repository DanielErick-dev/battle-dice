import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { crowSpots } from "./Fauna";
import { groundAt, islandShape, trailDistance, TRAIL_EARTH } from "./terrain";

const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);
const shape = islandShape(layout.trail);

describe("the crows by the road", () => {
  const spots = crowSpots(shape, layout.trail);

  it("sit along the whole trail, a handful of them", () => {
    expect(spots.length).toBeGreaterThanOrEqual(4);
    expect(spots.length).toBeLessThanOrEqual(12);
  });

  it("sit off the trodden road, on dry ground, standing on it", () => {
    for (const spot of spots) {
      expect(trailDistance(shape, spot.x, spot.z)).toBeGreaterThan(TRAIL_EARTH);
      const { height, cover } = groundAt(shape, spot.x, spot.z);
      expect(cover).not.toBe("sand");
      expect(spot.y).toBeCloseTo(height);
    }
  });
});
