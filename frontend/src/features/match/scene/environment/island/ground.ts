import { useEffect, useMemo } from "react";
import { BufferAttribute, Color, MeshStandardMaterial, PlaneGeometry, Vector3 } from "three";
import { paintTexture, type Painter } from "@/features/shared/three/canvasTexture";
import { withLampGlow } from "../shared/lampGlow";
import { groundAt, WATER_LEVEL, type Cover, type IslandShape } from "./terrain";
import { noise, smoothstep } from "./terrainNoise";

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
/** Patches the grass drifts into: deep moss in hollows, dry straw on the rises, bare stone on the steep. */
const MOSS = new Color("#24402f");
const STRAW = new Color("#4b4a33");
const CLIFF = new Color("#3d3a3d");
/** Sand the waves wash over, darker and colder. */
const WET_SAND = new Color("#4a4842");

/** Ground cells per world unit: enough for the hills, low-poly on purpose (flat shading). */
const CELLS_PER_UNIT = 1.6;
/** World units one copy of the detail texture spans. */
const DETAIL_TILE = 3.5;
/** The detail texture darkens the ground by about this much on average: the colours are lifted to match. */
const DETAIL_LIFT = 1.25;

/** One face's colour: its cover, drifting into moss, straw or bare stone by place and slope; wet by the sea. */
export function faceColor(
  cover: Cover,
  at: { x: number; z: number; height: number; upright: number },
  out: Color,
): Color {
  out.set(COVER_COLORS[cover]);
  const { x, z, height, upright } = at;
  if (cover === "grass" || cover === "meadow") {
    const patch = noise(x * 0.07 + 13, z * 0.07);
    out.lerp(MOSS, smoothstep(0.55, 0.8, patch) * 0.8);
    out.lerp(STRAW, smoothstep(0.35, 0.12, patch) * 0.6);
  }
  // Steep slopes shed their grass or earth and show the stone under it.
  if (cover === "grass" || cover === "meadow" || cover === "earth" || cover === "bank")
    out.lerp(CLIFF, smoothstep(0.9, 0.65, upright));
  if (cover === "sand") out.lerp(WET_SAND, smoothstep(WATER_LEVEL + 0.25, WATER_LEVEL, height));
  return out.multiplyScalar((0.86 + noise(x * 2.3, z * 2.3) * 0.2) * DETAIL_LIFT);
}

/** Grit, soft blotches and tiny strokes of blades in greys, tiling, multiplied over the ground's colours. */
const paintDetail: Painter = (ctx, size, random) => {
  ctx.fillStyle = "rgb(236,236,236)";
  ctx.fillRect(0, 0, size, size);
  // Drawn at every wrapped offset so the texture repeats without a seam.
  const wrapped = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size])
        if (x + dx > -reach && x + dx < size + reach && y + dy > -reach && y + dy < size + reach) draw(x + dx, y + dy);
  };
  for (let index = 0; index < 260; index++) {
    const [x, y, radius] = [random() * size, random() * size, 6 + random() * 22];
    const shade = Math.round(190 + random() * 65);
    const gradient = (cx: number, cy: number) => {
      const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      fill.addColorStop(0, `rgba(${shade},${shade},${shade},0.45)`);
      fill.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
      ctx.fillStyle = fill;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    };
    wrapped(x, y, radius, gradient);
  }
  ctx.lineCap = "round";
  for (let index = 0; index < 1600; index++) {
    const [x, y] = [random() * size, random() * size];
    const [length, angle] = [2 + random() * 5, -Math.PI / 2 + (random() - 0.5) * 1.2];
    const dark = random() < 0.7;
    ctx.strokeStyle = dark ? `rgba(70,70,70,${0.25 + random() * 0.25})` : `rgba(255,255,255,${0.2 + random() * 0.2})`;
    ctx.lineWidth = 0.8 + random() * 1.2;
    wrapped(x, y, length, (cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.stroke();
    });
  }
};

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
    const uvs = new Float32Array(position.count * 2);
    const color = new Color();
    const [a, b, c, normal] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    // Per face: flat-shaded, one cover and colour for its three corners, picked at its middle.
    for (let face = 0; face < position.count; face += 3) {
      a.fromBufferAttribute(position, face);
      b.fromBufferAttribute(position, face + 1);
      c.fromBufferAttribute(position, face + 2);
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      const [cx, cy, cz] = [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3];
      const { cover } = groundAt(shape, cx, cz);
      faceColor(cover, { x: cx, z: cz, height: cy, upright: Math.abs(normal.y) }, color);
      for (let corner = 0; corner < 3; corner++) {
        color.toArray(colors, (face + corner) * 3);
        uvs[(face + corner) * 2] = position.getX(face + corner) / DETAIL_TILE;
        uvs[(face + corner) * 2 + 1] = position.getZ(face + corner) / DETAIL_TILE;
      }
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const detail = paintTexture({ size: 256, draw: paintDetail, seed: 23, tile: true });
    detail.anisotropy = 8;
    const material = withLampGlow(
      new MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.95, flatShading: true }),
    );
    return { geometry, material, detail };
  }, [shape]);
  useEffect(
    () => () => {
      result.geometry.dispose();
      result.material.dispose();
      result.detail.dispose();
    },
    [result],
  );
  return result;
}
