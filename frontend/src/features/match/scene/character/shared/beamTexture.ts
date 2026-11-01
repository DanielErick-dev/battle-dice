import type { CanvasTexture } from "three";
import { canvasTexture, createCanvas } from "./canvas";

const WIDTH = 64;
const HEIGHT = 128;

/** How a column of light is painted: its fade up the column, and the darker streaks cut down it. */
export interface BeamLook {
  /** Where up the column (0 at the ground) the fade passes `midAlpha`. */
  midStop: number;
  midAlpha: number;
  /** A streak every `streakEvery` pixels across, `streakWidth(x)` wide. */
  streakEvery: number;
  streakWidth: (x: number) => number;
  /** A streak's darkness: `streakAlpha` plus `streakAlphaStep` for each of five shades. */
  streakAlpha: number;
  streakAlphaStep: number;
}

/** Light bright at the ground, thinning out up the column, streaked so it reads as rays rather than a tube. */
export function beamTexture(look: BeamLook): CanvasTexture {
  const { canvas, context } = createCanvas(WIDTH, HEIGHT);
  const gradient = context.createLinearGradient(0, HEIGHT, 0, 0);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(look.midStop, `rgba(255,255,255,${look.midAlpha})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.globalCompositeOperation = "destination-out";
  for (let x = 0; x < WIDTH; x += look.streakEvery) {
    context.fillStyle = `rgba(0,0,0,${look.streakAlpha + ((x * 7) % 5) * look.streakAlphaStep})`;
    context.fillRect(x, 0, look.streakWidth(x), HEIGHT);
  }
  return canvasTexture(canvas);
}
