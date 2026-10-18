import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type BufferGeometry } from "three";
import type { RandomSource } from "@/game/domain/random";

/** Draws a texture onto its canvas; keep it module-level, it keys the memo. */
export type Painter = (context: CanvasRenderingContext2D, size: number) => void;

/** A square canvas texture; `fade` thins it to transparent towards the rim, so a patch of ground has no edge. */
export function useCanvasTexture(paint: Painter, { size = 512, fade = true } = {}): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    paint(context, size);
    if (fade) {
      const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.globalCompositeOperation = "destination-in";
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [paint, size, fade]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Moves each corner by a random amount, the same for every face sharing it, so a rock stays closed. */
export function roughen<T extends BufferGeometry>(geometry: T, random: RandomSource, amount: number): T {
  const position = geometry.getAttribute("position");
  const offsets = new Map<string, number[]>();
  for (let index = 0; index < position.count; index++) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let offset = offsets.get(key);
    if (!offset) {
      offset = [0, 0, 0].map(() => (random() - 0.5) * amount);
      offsets.set(key, offset);
    }
    position.setXYZ(index, x + offset[0], y + offset[1], z + offset[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}
