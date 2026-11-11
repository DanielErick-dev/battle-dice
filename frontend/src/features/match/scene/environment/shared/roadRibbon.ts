import { CatmullRomCurve3, Vector3 } from "three";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "@/features/shared/board/boardLayout";

/** Half the road's width: wider than the slabs, its edges fading into the grass. */
export const ROAD_HALF_WIDTH = 1.9;
/** World units along the road per repeat of its texture. */
const ROAD_REPEAT = 4;
/** Road points per tile along the curve. */
const ROAD_STEPS = 6;

/** The road's vertices (a pair across it per step), texture coordinates and triangles. */
export interface RoadRibbon {
  positions: number[];
  uvs: number[];
  indices: number[];
}

/**
 * A ribbon along a smooth curve through the trail, lying just over the ground (`heightAt`); u runs across
 * it, v along it in texture repeats.
 */
export function roadRibbon(trail: readonly Vec3[], heightAt: (x: number, z: number) => number): RoadRibbon {
  // Running on under the start's plaza and out through the village gate behind it.
  const [first, second] = [trail[0], trail[1] ?? trail[0]];
  const [dx, dz] = [second[0] - first[0], second[2] - first[2]];
  const length = Math.hypot(dx, dz) || 1;
  const lead = START_PLAZA + TILE_PITCH * 1.5;
  const curve = new CatmullRomCurve3(
    [
      new Vector3(first[0] - (dx / length) * lead, 0, first[2] - (dz / length) * lead),
      ...trail.map(([x, , z]) => new Vector3(x, 0, z)),
    ],
    false,
    "centripetal",
  );
  const steps = Math.max(2, trail.length * ROAD_STEPS);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let walked = 0;
  let last: Vector3 | null = null;
  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    if (last) walked += point.distanceTo(last);
    last = point;
    for (const side of [-1, 1]) {
      const [x, z] = [point.x - tangent.z * ROAD_HALF_WIDTH * side, point.z + tangent.x * ROAD_HALF_WIDTH * side];
      positions.push(x, heightAt(x, z) + 0.015, z);
      uvs.push(side < 0 ? 0 : 1, walked / ROAD_REPEAT);
    }
    if (step > 0) {
      const at = step * 2;
      indices.push(at - 2, at, at - 1, at - 1, at, at + 1);
    }
  }
  return { positions, uvs, indices };
}
