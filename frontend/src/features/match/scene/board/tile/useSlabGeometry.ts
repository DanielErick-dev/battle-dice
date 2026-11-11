import { useEffect, useMemo } from "react";
import { Float32BufferAttribute, ShapeGeometry } from "three";
import { TILE_HEIGHT, TILE_PITCH } from "@/features/shared/board/boardLayout";
import { slabBody, slabShape, type SlabOutline } from "@/features/shared/board/slab";

const BEVEL = 0.05;

/**
 * A slab of the road from its outline: the body (bevelled, TILE_HEIGHT tall, centred on y = 0), its top
 * face (flat, at y = 0, its texture laid along `heading` so the rune points the way) and a flat copy
 * for the glow under it.
 */
export function useSlabGeometry(outline: SlabOutline, heading: number) {
  const key = `${outline.map(([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`).join(";")}|${heading.toFixed(3)}`;
  const shapes = useMemo(() => {
    const body = slabBody(outline, TILE_HEIGHT, BEVEL).translate(0, -TILE_HEIGHT / 2, 0);
    const face = new ShapeGeometry(slabShape(outline, BEVEL * 0.6)).rotateX(-Math.PI / 2);
    // u along the way, v across it (canvas y towards the way's right), a TILE_PITCH square per texture.
    const [cos, sin] = [Math.cos(heading), Math.sin(heading)];
    const position = face.getAttribute("position");
    const uv: number[] = [];
    for (let index = 0; index < position.count; index++) {
      const [x, z] = [position.getX(index), position.getZ(index)];
      uv.push(0.5 + (x * cos + z * sin) / TILE_PITCH, 0.5 - (-x * sin + z * cos) / TILE_PITCH);
    }
    face.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    const glow = new ShapeGeometry(slabShape(outline)).rotateX(-Math.PI / 2);
    return { body, face, glow };
    // The key stands for the outline and heading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(
    () => () => {
      shapes.body.dispose();
      shapes.face.dispose();
      shapes.glow.dispose();
    },
    [shapes],
  );
  return shapes;
}
