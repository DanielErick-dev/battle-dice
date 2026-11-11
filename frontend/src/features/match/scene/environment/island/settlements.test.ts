import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout } from "@/features/shared/board/boardLayout";
import { planCoast } from "./coast";
import { planSettlements } from "./settlements";
import { islandShape, trailDistance, TRAIL_EARTH } from "./terrain";

const layout = createBoardLayout(createBoard(POWER_TOURNAMENT_BOARD), 20);
const shape = islandShape(layout.trail);

describe("the settlements along the trail", () => {
  const { placements, chimneys } = planSettlements(shape, layout.trail);

  it("raise a castle by the finish, a watermill on the stream, and a village with smoking chimneys", () => {
    const pieces = placements.map(({ piece }) => piece);
    expect(pieces).toContain("building_castle_blue");
    expect(pieces).toContain("building_watermill_blue");
    expect(pieces.filter((piece) => piece.startsWith("building_home")).length).toBeGreaterThan(5);
    expect(chimneys.length).toBeGreaterThan(5);
  });

  it("never build on the road", () => {
    for (const { piece, x, z } of placements) {
      expect(trailDistance(shape, x, z), piece).toBeGreaterThan(TRAIL_EARTH);
    }
  });

  it("come out the same every time", () => {
    expect(planSettlements(shape, layout.trail).placements).toEqual(placements);
  });
});

describe("the coast", () => {
  it("has rocks on the waterline, a jetty and no cartoon life", () => {
    const town = planSettlements(shape, layout.trail);
    const { pieces } = planCoast(shape, layout.trail, town, { bushes: [], rocks: [] });
    expect(pieces.filter(({ piece }) => piece.startsWith("rocks-sand")).length).toBeGreaterThan(5);
    expect(pieces.map(({ piece }) => piece)).toContain("structure-platform-dock");
    expect(pieces.some(({ piece }) => /^(flower|mushroom|crops|palm)/.test(piece))).toBe(false);
  });
});
