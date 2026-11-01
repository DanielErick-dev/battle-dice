import { seededRandom } from "@/game/domain/core/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { speckle } from "../kit/painting";
import type { NoiseLook } from "../kit/textures";

/** Old paving in the moonlight: uneven slabs, some lost to the soil, worn and cracked. */
function paintPaving(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(67);
  context.fillStyle = "#0d1014";
  context.fillRect(0, 0, size, size);
  const cell = 64;
  for (let row = 0; row < size / cell; row++) {
    const offset = row % 2 ? cell * 0.5 : 0;
    for (let column = -1; column < size / cell; column++) {
      if (random() < 0.12) continue;
      const left = column * cell + offset;
      const top = row * cell;
      const jitter = () => (random() - 0.5) * 9;
      const shade = 52 + random() * 26;
      context.fillStyle = `rgb(${shade - 6},${shade},${shade + 10})`;
      context.beginPath();
      context.moveTo(left + 4 + jitter(), top + 4 + jitter());
      context.lineTo(left + cell - 4 + jitter(), top + 4 + jitter());
      context.lineTo(left + cell - 4 + jitter(), top + cell - 4 + jitter());
      context.lineTo(left + 4 + jitter(), top + cell - 4 + jitter());
      context.fill();
      if (random() < 0.35) {
        context.strokeStyle = "rgba(10,12,16,0.7)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(left + random() * cell, top + random() * cell);
        context.lineTo(left + random() * cell, top + random() * cell);
        context.lineTo(left + random() * cell, top + random() * cell);
        context.stroke();
      }
    }
  }
  speckle(context, size, random, {
    count: 3000,
    odds: 0.55,
    colours: ["rgba(8,10,14,0.35)", "rgba(140,160,190,0.14)"],
    spread: 2,
  });
  // A wash of moonlight, brightest where he stands.
  const light = context.createRadialGradient(size / 2, size * 0.45, 0, size / 2, size / 2, size / 2);
  light.addColorStop(0, "rgba(150,180,220,0.18)");
  light.addColorStop(1, "rgba(150,180,220,0)");
  context.fillStyle = light;
  context.fillRect(0, 0, size, size);
}

/** A pale moon with soft grey seas on it. */
export function paintMoon(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(71);
  const centre = size / 2;
  const face = context.createRadialGradient(centre * 0.85, centre * 0.85, 0, centre, centre, centre * 0.92);
  face.addColorStop(0, "rgba(255,255,255,1)");
  face.addColorStop(0.9, "rgba(225,232,245,1)");
  face.addColorStop(1, "rgba(225,232,245,0)");
  context.fillStyle = face;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "source-atop";
  for (let sea = 0; sea < 9; sea++) {
    const x = centre + (random() - 0.5) * size * 0.6;
    const y = centre + (random() - 0.5) * size * 0.6;
    const radius = 6 + random() * 16;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(120,135,160,0.45)");
    gradient.addColorStop(1, "rgba(120,135,160,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

export const STONE: NoiseLook = { base: [72, 78, 88], dark: [36, 40, 48], light: [112, 120, 134], fadeOut: false };

/** An old processional way of cold blue slabs, dead leaves and rubble. */
const RUIN_GROUND: GroundDressing = {
  wash: { colour: "#7dd3fc", alpha: 0.25 },
  patches: { colours: ["rgba(140,190,230,0.18)"], count: 18, radius: [20, 50] },
  path: { kind: "slabs", colour: "#5d6a7a", edge: "#161b22", width: [0.16, 0.26] },
  litter: [
    { shape: "leaf", colours: ["#5b5a52", "#3f3d36"], count: 90, size: 5 },
    { shape: "pebble", colours: ["#6b7280", "#4b5563"], count: 50, size: 3 },
  ],
};
export const paintRuinFloor = withDressing(paintPaving, RUIN_GROUND);
