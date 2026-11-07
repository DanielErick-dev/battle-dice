import { CanvasTexture } from "three";
import { canvasTexture, createCanvas, useCanvasTexture } from "../shared/canvas";
import { jitter } from "../shared/hash";
import { radialDisc } from "../shared/softDisc";

/** A soft, uneven blot of smoke: a few overlapping radial gradients. */
function smokeBlot(): CanvasTexture {
  const size = 128;
  const { canvas, context } = createCanvas(size);
  for (let blob = 0; blob < 6; blob += 1) {
    const x = size / 2 + (jitter(blob, 11) - 0.5) * size * 0.35;
    const y = size / 2 + (jitter(blob, 12) - 0.5) * size * 0.35;
    const radius = size * (0.25 + jitter(blob, 13) * 0.2);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return canvasTexture(canvas);
}

const sparkDot = () => radialDisc(64, 0.3, 0.55);

export function useSmokeTexture(): CanvasTexture {
  return useCanvasTexture(smokeBlot);
}

/** A soft round dot, so points read as sparks rather than squares. */
export function useSparkTexture(): CanvasTexture {
  return useCanvasTexture(sparkDot);
}
