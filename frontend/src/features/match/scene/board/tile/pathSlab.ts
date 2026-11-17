import type { SlabOutline } from "@/features/shared/board/slab";

/** A model's extent on x (across the way) and z (along it), as useFittedProp centres it. */
export interface SlabExtent {
  width: number;
  depth: number;
}

/**
 * Bends a model laid along +z onto a road slab's four corners (back right, front right, front left, back left):
 * x runs from the right edge to the left, z from the back to the front, y (0 to 1) from `bottom` up by `height`.
 * Normals follow the slab's way and the stretch on each axis.
 */
export function warpOntoSlab(
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  extent: SlabExtent,
  outline: SlabOutline,
  bottom: number,
  height: number,
): { positions: Float32Array; normals: Float32Array } {
  const [backRight, frontRight, frontLeft, backLeft] = outline as readonly (readonly [number, number])[];
  if (!backRight || !frontRight || !frontLeft || !backLeft) throw new Error("A road slab has four corners");
  const warped = new Float32Array(positions.length);
  const bent = new Float32Array(normals.length);
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [right, left] = [mid(backRight, frontRight), mid(backLeft, frontLeft)];
  const [back, front] = [mid(backRight, backLeft), mid(frontRight, frontLeft)];
  const across = [left[0]! - right[0]!, left[1]! - right[1]!];
  const along = [front[0]! - back[0]!, front[1]! - back[1]!];
  const [acrossLength, alongLength] = [Math.hypot(across[0]!, across[1]!) || 1, Math.hypot(along[0]!, along[1]!) || 1];
  // Inverse-transpose of the stretch: a normal leans less along an axis that was pulled out.
  const [scaleAcross, scaleAlong] = [acrossLength / extent.width, alongLength / extent.depth];

  for (let index = 0; index < positions.length; index += 3) {
    const c = positions[index]! / extent.width + 0.5;
    const a = positions[index + 2]! / extent.depth + 0.5;
    const nearX = backRight[0] + (backLeft[0] - backRight[0]) * c;
    const nearZ = backRight[1] + (backLeft[1] - backRight[1]) * c;
    const farX = frontRight[0] + (frontLeft[0] - frontRight[0]) * c;
    const farZ = frontRight[1] + (frontLeft[1] - frontRight[1]) * c;
    warped[index] = nearX + (farX - nearX) * a;
    warped[index + 1] = bottom + positions[index + 1]! * height;
    warped[index + 2] = nearZ + (farZ - nearZ) * a;

    const nx = normals[index]! / scaleAcross;
    const ny = normals[index + 1]! / height;
    const nz = normals[index + 2]! / scaleAlong;
    const x = (nx * across[0]!) / acrossLength + (nz * along[0]!) / alongLength;
    const z = (nx * across[1]!) / acrossLength + (nz * along[1]!) / alongLength;
    const length = Math.hypot(x, ny, z);
    // A degenerate normal points up rather than going NaN (the bloom would smear it over the screen).
    if (length > 1e-6) [bent[index], bent[index + 1], bent[index + 2]] = [x / length, ny / length, z / length];
    else [bent[index], bent[index + 1], bent[index + 2]] = [0, 1, 0];
  }
  return { positions: warped, normals: bent };
}

/**
 * The slab's ends pushed out by `gap / 2` each, square to themselves: neighbouring slabs share the line midway
 * between their tiles, so the walkway runs on unbroken from one to the next.
 */
export function closeSlabGaps(outline: SlabOutline, gap: number): [number, number][] {
  const [backRight, frontRight, frontLeft, backLeft] = outline as readonly (readonly [number, number])[];
  if (!backRight || !frontRight || !frontLeft || !backLeft) throw new Error("A road slab has four corners");
  const centre = [
    (backRight[0] + frontRight[0] + frontLeft[0] + backLeft[0]) / 4,
    (backRight[1] + frontRight[1] + frontLeft[1] + backLeft[1]) / 4,
  ] as const;
  const pushed = (a: readonly [number, number], b: readonly [number, number]): [[number, number], [number, number]] => {
    // Square to the edge, away from the slab's middle.
    let [nx, nz] = [b[1] - a[1], a[0] - b[0]];
    const length = Math.hypot(nx, nz) || 1;
    [nx, nz] = [nx / length, nz / length];
    const mid = [(a[0] + b[0]) / 2 - centre[0], (a[1] + b[1]) / 2 - centre[1]];
    if (nx * mid[0]! + nz * mid[1]! < 0) [nx, nz] = [-nx, -nz];
    const step = gap / 2;
    return [
      [a[0] + nx * step, a[1] + nz * step],
      [b[0] + nx * step, b[1] + nz * step],
    ];
  };
  const [newBackRight, newBackLeft] = pushed(backRight, backLeft);
  const [newFrontRight, newFrontLeft] = pushed(frontRight, frontLeft);
  return [newBackRight, newFrontRight, newFrontLeft, newBackLeft];
}
