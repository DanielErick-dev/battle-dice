import { describe, expect, it } from "vitest";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { corridorSpan, crackSegments, everyNthDepth, WALL_HEIGHT } from "./layout";

const track: Vec3[] = [0, 1, 2, 3, 4, 5, 6].map((index) => [12, 0.5, -index * 2]);

describe("a realm corridor's layout", () => {
  it("runs past the first and last tiles, centred between them, under the tiles", () => {
    const span = corridorSpan(track);
    expect(span.x).toBe(12);
    expect(span.near).toBeGreaterThan(0);
    expect(span.far).toBeLessThan(-12);
    expect(span.length).toBeCloseTo(span.near - span.far);
    expect(span.centreZ).toBeCloseTo(-6);
    expect(span.floorY).toBeLessThan(0.5);
  });

  it("is the same whichever way the track runs", () => {
    expect(corridorSpan([...track].reverse())).toEqual(corridorSpan(track));
  });

  it("stands pillars on every n-th tile from the second", () => {
    expect(everyNthDepth(track, 3)).toEqual([-2, -8]);
    expect(everyNthDepth(track, 2)).toEqual([-2, -6, -10]);
  });

  it("zigzags a crack down from near the wall's top, the same for a seed", () => {
    const segments = crackSegments(3);
    expect(segments).toHaveLength(5);
    expect(segments[0].y).toBeLessThan(WALL_HEIGHT * 0.9);
    for (let index = 1; index < segments.length; index++) expect(segments[index].y).toBeLessThan(segments[index - 1].y);
    expect(Math.sign(segments[0].tilt)).not.toBe(Math.sign(segments[1].tilt));
    expect(crackSegments(3)).toEqual(segments);
  });
});
