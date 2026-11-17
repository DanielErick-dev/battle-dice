import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { lanternSpots } from "./scatter";
import { groundAt, islandShape, RIVER_HALF_WIDTH, riverDistance, trailDistance, WATER_LEVEL } from "./terrain";

const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);
const shape = islandShape(layout.trail);
const lanterns = lanternSpots(layout.trail, shape);

describe("the lamp posts along the road", () => {
  it("light the whole road, a post every few tiles", () => {
    expect(lanterns.length).toBeGreaterThan(layout.trail.length / 8);
  });

  it("stand on the road's edge, off every stretch of the trail and the stream", () => {
    for (const { at } of lanterns) {
      expect(trailDistance(shape, at[0], at[2])).toBeGreaterThan(1.5);
      expect(layout.trail.every(([x, , z]) => Math.hypot(x - at[0], z - at[2]) > 1.5)).toBe(true);
      expect(riverDistance(shape, at[0], at[2])).toBeGreaterThan(RIVER_HALF_WIDTH);
    }
  });

  it("throw their light towards the road", () => {
    for (const { at, pool } of lanterns) {
      expect(trailDistance(shape, pool.x, pool.z)).toBeLessThan(trailDistance(shape, at[0], at[2]));
    }
  });
});

describe("the beach", () => {
  it("never sinks the trail's ground under the sea", () => {
    const dry = layout.trail.filter(([x, , z]) => riverDistance(shape, x, z) > RIVER_HALF_WIDTH + 1);
    for (const [x, , z] of dry) expect(groundAt(shape, x, z).height).toBeGreaterThan(WATER_LEVEL + 0.5);
  });
});
