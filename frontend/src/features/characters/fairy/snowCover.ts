import type { CanvasTexture } from "three";
import { canvasTexture, createCanvas, useCanvasTexture } from "../shared/canvas";
import { parkMiller } from "../shared/hash";

/** Drifts heaped on the snow, where the trap's spikes stood: where (shares of the tile), how big. */
export const DRIFTS = [
  { x: -0.2, z: 0.03, radius: 0.2 },
  { x: 0.02, z: -0.06, radius: 0.24 },
  { x: 0.2, z: 0.03, radius: 0.19 },
  { x: 0.12, z: -0.26, radius: 0.16 },
  { x: -0.24, z: -0.26, radius: 0.14 },
  { x: -0.06, z: 0.28, radius: 0.15 },
];
/** Ice crystals poking out of the snow: where, how tall, how far turned. */
export const CRYSTALS = [
  { x: -0.32, z: 0.3, height: 0.26, turn: 0.3 },
  { x: 0.32, z: 0.24, height: 0.2, turn: 1.2 },
];

/** Fresh snow: white with soft blue hollows and a scatter of glints. */
function drawSnow(): CanvasTexture {
  const size = 256;
  const { canvas, context } = createCanvas(size);
  context.fillStyle = "#f6fbff";
  context.fillRect(0, 0, size, size);
  // Soft hollows where the snow lies thinner.
  const random = parkMiller(11);
  for (let hollow = 0; hollow < 40; hollow++) {
    const [x, y, r] = [random() * size, random() * size, 10 + random() * 34];
    const shade = context.createRadialGradient(x, y, 0, x, y, r);
    shade.addColorStop(0, "rgba(160,200,235,0.22)");
    shade.addColorStop(1, "rgba(160,200,235,0)");
    context.fillStyle = shade;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let glint = 0; glint < 160; glint++) {
    context.fillStyle = `rgba(255,255,255,${0.5 + random() * 0.5})`;
    context.fillRect(random() * size, random() * size, 1.5, 1.5);
  }
  return canvasTexture(canvas, true);
}

export function useSnowTexture(): CanvasTexture {
  return useCanvasTexture(drawSnow);
}
