import type { CanvasTexture } from "three";
import { canvasTexture, createCanvas, useCanvasTexture } from "./canvas";

/**
 * A round disc fading out to its rim, white on transparent, `size` pixels across: full at the
 * middle, `midAlpha` at `midStop` of the way out, gone at the rim.
 */
export function radialDisc(size: number, midStop: number, midAlpha: number): CanvasTexture {
  const { canvas, context } = createCanvas(size);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(midStop, `rgba(255,255,255,${midAlpha})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return canvasTexture(canvas);
}

const softDisc = () => radialDisc(128, 0.45, 0.6);

/** A soft round disc fading out to its rim, white on transparent: for shadows, fog and glows. */
export function useSoftDisc(): CanvasTexture {
  return useCanvasTexture(softDisc);
}
