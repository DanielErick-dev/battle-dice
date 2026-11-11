import type { RandomSource } from "@/game/domain/core/random";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "@/features/shared/board/boardLayout";

/** Ground along the trail: the road's slabs (see TileMesh) sit sunk in it, a little proud of the earth. */
export const TRAIL_GROUND = 0.06;
/** How far behind it (towards the far side) a thing of height h hides the ground, with the camera up at 45°. */
const SHADE_REACH = 1.15;

/** A box on the ground (x, z). */
export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Something already set down, by its centre and reach, for the next pieces to keep clear of. */
export interface Blocker {
  x: number;
  z: number;
  radius: number;
}

/** The trail's extent grown by a margin on each side (back is the far side, front the camera's). */
export function trailBounds(trail: readonly Vec3[], margin: { side: number; back: number; front: number }): Bounds {
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  return {
    minX: Math.min(...xs) - margin.side,
    maxX: Math.max(...xs) + margin.side,
    minZ: Math.min(...zs) - margin.back,
    maxZ: Math.max(...zs) + margin.front,
  };
}

/** A tile hides behind a thing of `height` when it lies a little behind it and not far to either side. */
export function hidesTiles(trail: readonly Vec3[], x: number, z: number, height: number, spread: number): boolean {
  return trail.some(([tx, , tz]) => tz < z + 1 && z - tz < height * SHADE_REACH && Math.abs(tx - x) < spread + 1.4);
}

/** Distance from the trail's centre line, and the direction (unnormalised) of the step it is nearest. */
export function trailNearest(
  trail: readonly Vec3[],
  x: number,
  z: number,
): { distance: number; dx: number; dz: number } {
  let best = { distance: Infinity, dx: 1, dz: 0 };
  for (let index = 1; index < trail.length; index++) {
    const [a, b] = [trail[index - 1], trail[index]];
    const [dx, dz] = [b[0] - a[0], b[2] - a[2]];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1)));
    const distance = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
    if (distance < best.distance) best = { distance, dx, dz };
  }
  return best;
}

/** Clear of the start's plaza by `radius`. */
export function clearOfStart(trail: readonly Vec3[], x: number, z: number, radius: number): boolean {
  return Math.hypot(x - trail[0][0], z - trail[0][2]) > START_PLAZA + TILE_PITCH + radius;
}

/** Further than `gap` from every blocker's reach. */
export function isFree(blockers: readonly Blocker[], x: number, z: number, radius: number, gap: number): boolean {
  return blockers.every((other) => Math.hypot(other.x - x, other.z - z) > other.radius + radius + gap);
}

/** Half the wider side of a piece of `size` (width, height, depth) at `scale`. */
export function footprint(size: readonly [number, number, number], scale: number): number {
  return (Math.max(size[0], size[2]) / 2) * scale;
}

/** One entry of `entries` (its weight second), drawn with a single roll of `random`; undefined if all weigh 0. */
export function pickWeighted<T extends readonly [unknown, number, ...unknown[]]>(
  entries: readonly T[],
  random: RandomSource,
): T | undefined {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  return entries.find(([, weight]) => (roll -= weight) < 0);
}
