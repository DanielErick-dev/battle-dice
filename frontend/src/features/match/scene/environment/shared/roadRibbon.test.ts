import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { ROAD_HALF_WIDTH, roadRibbon } from "./roadRibbon";
import { itemAt } from "@/features/shared/collections/items";

const trail: Vec3[] = [0, 1, 2, 3, 4].map((index) => [index * 2, 0, 0]);

describe("the road's ribbon", () => {
  const { positions, uvs, indices } = roadRibbon(trail, () => 0.5);
  const vertices = positions.length / 3;

  it("lays a pair of vertices across the road per step, two triangles between steps", () => {
    expect(vertices % 2).toBe(0);
    expect(uvs.length).toBe(vertices * 2);
    expect(indices.length).toBe((vertices / 2 - 1) * 6);
    expect(Math.max(...indices)).toBe(vertices - 1);
  });

  it("lies just over the ground, as wide as the road", () => {
    for (let index = 0; index < vertices; index++) expect(positions[index * 3 + 1]).toBeCloseTo(0.515);
    // A straight trail along x: the two sides sit either side of it in z.
    expect(Math.abs(itemAt(positions, 2) - itemAt(positions, 5))).toBeCloseTo(ROAD_HALF_WIDTH * 2);
  });

  it("runs u across the road and v further along it", () => {
    expect([uvs[0], uvs[2]]).toEqual([0, 1]);
    expect(uvs.at(-1)).toBeGreaterThan(itemAt(uvs, 1));
  });
});
