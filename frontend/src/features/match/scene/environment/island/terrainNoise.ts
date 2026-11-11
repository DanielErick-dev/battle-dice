/** Smooth value noise for the island's ground, in plain TS (the shaders have their own, see realm/glsl.ts). */

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise in [0, 1]. */
export function noise(x: number, z: number): number {
  const [ix, iz] = [Math.floor(x), Math.floor(z)];
  const [fx, fz] = [x - ix, z - iz];
  const [ux, uz] = [fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)];
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** Three octaves of `noise`, for hills and peaks. */
export function fbm(x: number, z: number): number {
  return noise(x, z) * 0.55 + noise(x * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, z * 4.3) * 0.15;
}
