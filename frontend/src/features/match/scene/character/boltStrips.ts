import { BufferAttribute, BufferGeometry, Vector3, type Object3D } from "three";

/** How far a kink strays sideways, as a share of its segment's length, and at most (share of `size`). */
const KINK = 0.7;
const MAX_KINK = 0.05;

/** Working vectors (frames run one at a time, so every bolt can share them). */
const scratch = { side: new Vector3(), along: new Vector3(), toCamera: new Vector3(), point: new Vector3() };

/**
 * `strips` camera-facing strips of `points` pairs of vertices each, joined into triangles: a mesh
 * of thin bolts, laid out every frame with writeStrip.
 */
export function stripsGeometry(strips: number, points: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(strips * points * 2 * 3), 3));
  const indices: number[] = [];
  for (let strip = 0; strip < strips; strip++) {
    const base = strip * points * 2;
    for (let k = 0; k < points - 1; k++) {
      const a = base + k * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Knocks the bolt's inner points sideways, zigzagging (alternate sides) by random amounts fixed by
 * `seed`, so it reads as lightning rather than a smooth stroke. The ends stay put.
 */
export function jag(points: Vector3[], seed: number, size: number) {
  const segment = points[0].distanceTo(points.at(-1)!) / (points.length - 1);
  const reach = Math.min(segment * KINK, MAX_KINK * size);
  for (let k = 1; k < points.length - 1; k++) {
    const sign = k % 2 === 0 ? 1 : -1;
    const amount = reach * (0.4 + 0.6 * noise(seed + k * 1.7));
    scratch.side.set(noise(seed + k * 3.1) - 0.5, noise(seed + k * 5.3) - 0.5, noise(seed + k * 7.9) - 0.5);
    points[k].addScaledVector(scratch.side.normalize(), sign * amount);
  }
}

/**
 * Writes strip `strip` of `geometry` along `points` (world space, as many as the strip holds),
 * facing the camera, into `group`'s space; a width of 0 hides it. The tips taper so the bolt ends
 * in points, unless `closed` (a loop).
 */
export function writeStrip(
  geometry: BufferGeometry,
  strip: number,
  points: readonly Vector3[],
  width: number,
  cameraPosition: Vector3,
  group: Object3D,
  closed = false,
) {
  const position = geometry.attributes.position as BufferAttribute;
  position.needsUpdate = true;
  const last = points.length - 1;
  const base = strip * points.length * 2;
  points.forEach((here, k) => {
    scratch.along.subVectors(points[Math.min(k + 1, last)], points[Math.max(k - 1, 0)]);
    scratch.toCamera.subVectors(cameraPosition, here);
    scratch.side.crossVectors(scratch.along, scratch.toCamera).normalize();
    const half = !closed && (k === 0 || k === last) ? width * 0.3 : width;
    for (const [offset, sign] of [
      [0, 1],
      [1, -1],
    ] as const) {
      scratch.point.copy(here).addScaledVector(scratch.side, sign * half);
      group.worldToLocal(scratch.point);
      position.setXYZ(base + k * 2 + offset, scratch.point.x, scratch.point.y, scratch.point.z);
    }
  });
}

/** A repeatable pseudo-random number in [0, 1) for a given input. */
export function noise(x: number): number {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
