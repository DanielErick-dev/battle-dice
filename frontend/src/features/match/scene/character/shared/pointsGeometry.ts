import { BufferAttribute, BufferGeometry } from "three";

/** A geometry of `count` points, all at the origin until written each frame; with `colors`, a colour per point. */
export function pointsGeometry(count: number, colors = false): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  if (colors) geometry.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
  return geometry;
}
