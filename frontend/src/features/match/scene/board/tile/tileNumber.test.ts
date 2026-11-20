import { describe, expect, it } from "vitest";
import { SQUARE_SLAB } from "@/features/shared/board/slab";
import { frontEdge, plaqueEdge, showsRune } from "./TileNumber";

describe("the tile number's plaque", () => {
  it("stands on the edge nearest the camera (+z)", () => {
    const edge = frontEdge(SQUARE_SLAB);
    expect(edge.z).toBeCloseTo(1);
    expect(edge.x).toBeCloseTo(0);
    expect(edge.outZ).toBeCloseTo(1);
  });

  it("follows a slab turned on a bend", () => {
    const turned = SQUARE_SLAB.map(
      ([x, z]) => [x * Math.cos(0.6) - z * Math.sin(0.6), x * Math.sin(0.6) + z * Math.cos(0.6)] as const,
    );
    const edge = frontEdge(turned);
    const mids = turned.map(([, z], index) => (z + turned[(index + 1) % turned.length]![1]) / 2);
    expect(edge.z).toBeCloseTo(Math.max(...mids));
  });
});

describe("the rune medallion over the number", () => {
  const tile = (kind: string) => ({ effect: { kind } }) as unknown as Parameters<typeof showsRune>[0];
  const theme = (kind: string) => ({ kind }) as unknown as Parameters<typeof showsRune>[1];

  it("shows on special tiles that have no 3D ornament", () => {
    expect(showsRune(tile("curse"), theme("curse"))).toBe(true);
  });

  it("is left off plain tiles and tiles whose ornament already says what they do", () => {
    expect(showsRune(tile("none"), theme("regular"))).toBe(false);
    expect(showsRune(tile("portal"), theme("portal"))).toBe(false);
    expect(showsRune(tile("card"), theme("card"))).toBe(false);
  });
});

describe("where a number plaque stands", () => {
  // Corners back-right, front-right, front-left, back-left, for a road running towards the camera (+z).
  const towardCamera = [
    [-1, -1],
    [-1, 1],
    [1, 1],
    [1, -1],
  ] as const;

  it("on a side kerb when the road comes towards the camera, never between tiles", () => {
    const edge = plaqueEdge(towardCamera);
    expect(Math.abs(edge.x)).toBeCloseTo(1);
    expect(edge.z).toBeCloseTo(0);
  });

  it("on the kerb facing the camera when the road runs across the view", () => {
    // Heading +x: back-right is (-1, 1), so the right kerb is the one at +z.
    const across = [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ] as const;
    expect(plaqueEdge(across)).toMatchObject({ x: 0, z: 1 });
  });
});
