import { ExtrudeGeometry, Float32BufferAttribute, Shape, type BufferGeometry } from "three";
import { TILE_SIZE } from "./boardLayout";

/** A slab's corners round its tile's centre (x, z), as BoardLayout.slab gives them. */
export type SlabOutline = readonly (readonly [number, number])[];

/** Off the main path (realm tracks), a plain square. */
export const SQUARE_SLAB: SlabOutline = [
  [-TILE_SIZE / 2, TILE_SIZE / 2],
  [TILE_SIZE / 2, TILE_SIZE / 2],
  [TILE_SIZE / 2, -TILE_SIZE / 2],
  [-TILE_SIZE / 2, -TILE_SIZE / 2],
];

/** The outline drawn flat as a three.js Shape (shape y is -z once turned flat), pulled in by `inset` (out, if negative). */
export function slabShape(outline: SlabOutline, inset = 0): Shape {
  const cx = outline.reduce((sum, [x]) => sum + x, 0) / outline.length;
  const cz = outline.reduce((sum, [, z]) => sum + z, 0) / outline.length;
  const shape = new Shape();
  outline.forEach(([x, z], index) => {
    const length = Math.hypot(x - cx, z - cz) || 1;
    const [px, pz] = [x - ((x - cx) / length) * inset, z - ((z - cz) / length) * inset];
    if (index === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  });
  shape.closePath();
  return shape;
}

/**
 * The slab as a solid: from y = 0 up to `height`, its edges rounded by `bevel`, grown out by `grow`
 * (a cover laid over a slab). UVs span its extent once, so a texture covers it whole.
 */
export function slabBody(outline: SlabOutline, height: number, bevel: number, grow = 0): ExtrudeGeometry {
  const body = new ExtrudeGeometry(slabShape(outline, bevel - grow), {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  body.rotateX(-Math.PI / 2).translate(0, bevel, 0);
  spanUvs(body);
  return body;
}

/** UVs from x and z across the geometry's extent (0 to 1 each way). */
export function spanUvs(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const position = geometry.getAttribute("position");
  const uv: number[] = [];
  for (let index = 0; index < position.count; index++) {
    uv.push(
      (position.getX(index) - min.x) / (max.x - min.x || 1),
      1 - (position.getZ(index) - min.z) / (max.z - min.z || 1),
    );
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
}
