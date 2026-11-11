import { useEffect, useMemo } from "react";
import { BufferAttribute, Color, MeshStandardMaterial, PlaneGeometry } from "three";
import { groundAt, type Cover, type IslandShape } from "./terrain";
import { noise } from "./terrainNoise";

/** Ground cover colours, a grim night: muddy, cold and desaturated; each vertex varies one a little. */
const COVER_COLORS: Record<Cover, string> = {
  earth: "#4a3d31",
  grass: "#2b3a2f",
  meadow: "#34432f",
  paving: "#57565d",
  sand: "#6d6556",
  bank: "#3a3129",
  rock: "#35343d",
  snow: "#9ba4ae",
};

/** Ground cells per world unit: enough for the hills, low-poly on purpose (flat shading). */
const CELLS_PER_UNIT = 1.6;

export function useIslandGround(shape: IslandShape) {
  const result = useMemo(() => {
    const width = shape.halfWidth * 2.3;
    const depth = shape.halfDepth * 2.3;
    const grid = new PlaneGeometry(width, depth, Math.ceil(width * CELLS_PER_UNIT), Math.ceil(depth * CELLS_PER_UNIT));
    grid.rotateX(-Math.PI / 2);
    grid.translate(0, 0, shape.centerZ);
    // Heights on the shared corners first (a quarter of the work), then split into flat faces.
    const corners = grid.getAttribute("position");
    for (let index = 0; index < corners.count; index++) {
      corners.setY(index, groundAt(shape, corners.getX(index), corners.getZ(index)).height);
    }
    const geometry = grid.toNonIndexed();
    grid.dispose();
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const color = new Color();
    // Per face: flat-shaded, one cover and colour for its three corners, picked at its middle.
    for (let face = 0; face < position.count; face += 3) {
      let [cx, cz] = [0, 0];
      for (let corner = 0; corner < 3; corner++) {
        cx += position.getX(face + corner) / 3;
        cz += position.getZ(face + corner) / 3;
      }
      const { cover } = groundAt(shape, cx, cz);
      color.set(COVER_COLORS[cover]).multiplyScalar(0.86 + noise(cx * 2.3, cz * 2.3) * 0.2);
      for (let corner = 0; corner < 3; corner++) color.toArray(colors, (face + corner) * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    return { geometry, material };
  }, [shape]);
  useEffect(
    () => () => {
      result.geometry.dispose();
      result.material.dispose();
    },
    [result],
  );
  return result;
}
