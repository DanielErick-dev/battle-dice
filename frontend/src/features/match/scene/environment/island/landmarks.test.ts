import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { CHARACTER_IDS } from "@/features/characters";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { LANDMARK_RADIUS, planLandmarks } from "./landmarks";
import { planSettlements } from "./settlements";
import { islandShape, trailDistance, TRAIL_EARTH } from "./terrain";

const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);
const shape = islandShape(layout.trail);
const town = planSettlements(shape, layout.trail);
const spots = planLandmarks(shape, layout.trail, town.blockers, CHARACTER_IDS);

describe("the characters' landmarks", () => {
  it("find a spot for every character", () => {
    expect(spots.map(({ character }) => character).sort()).toEqual([...CHARACTER_IDS].sort());
  });

  it("stand off the tiles and the houses, and apart from each other", () => {
    for (const { character, x, z } of spots) {
      expect(trailDistance(shape, x, z) - TRAIL_EARTH, character).toBeGreaterThanOrEqual(LANDMARK_RADIUS);
      for (const blocker of town.blockers) {
        expect(Math.hypot(blocker.x - x, blocker.z - z), character).toBeGreaterThan(blocker.radius + LANDMARK_RADIUS);
      }
      for (const other of spots.filter((spot) => spot.character !== character)) {
        expect(Math.hypot(other.x - x, other.z - z), character).toBeGreaterThan(LANDMARK_RADIUS * 2);
      }
    }
  });
});
