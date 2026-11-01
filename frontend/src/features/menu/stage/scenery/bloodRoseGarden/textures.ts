import { seededRandom } from "@/game/domain/random";
import type { GroundDressing } from "../kit/groundDressing";
import type { NoiseLook } from "../kit/textures";

/** The ritual circle in blood: rings, a seven-pointed star, glyphs between the rings and drips around them. */
export function paintBloodCircle(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(107);
  const centre = size / 2;
  const blood = () =>
    `rgba(${120 + random() * 50},${4 + random() * 10},${16 + random() * 14},${0.75 + random() * 0.2})`;
  context.lineCap = context.lineJoin = "round";
  const ring = (radius: number, width: number) => {
    // Painted by hand: a few overlapping strokes, never a clean line.
    for (let pass = 0; pass < 3; pass++) {
      context.strokeStyle = blood();
      context.lineWidth = width * (0.6 + random() * 0.6);
      context.beginPath();
      for (let step = 0; step <= 64; step++) {
        const angle = (step / 64) * Math.PI * 2;
        const wobble = radius + (random() - 0.5) * 2.5;
        context.lineTo(centre + Math.cos(angle) * wobble, centre + Math.sin(angle) * wobble);
      }
      context.stroke();
    }
  };
  ring(size * 0.46, 5);
  ring(size * 0.4, 3);
  ring(size * 0.2, 3);
  const points = 7;
  context.strokeStyle = blood();
  context.lineWidth = 3;
  context.beginPath();
  for (let step = 0; step <= points; step++) {
    const angle = ((step * 3) / points) * Math.PI * 2 - Math.PI / 2;
    context.lineTo(centre + Math.cos(angle) * size * 0.4, centre + Math.sin(angle) * size * 0.4);
  }
  context.stroke();
  for (let glyph = 0; glyph < 21; glyph++) {
    const angle = (glyph / 21) * Math.PI * 2;
    const x = centre + Math.cos(angle) * size * 0.43;
    const y = centre + Math.sin(angle) * size * 0.43;
    context.strokeStyle = blood();
    context.lineWidth = 2;
    context.beginPath();
    for (let stroke = 0; stroke < 3; stroke++) {
      context.moveTo(x + (random() - 0.5) * 10, y + (random() - 0.5) * 10);
      context.lineTo(x + (random() - 0.5) * 10, y + (random() - 0.5) * 10);
    }
    context.stroke();
  }
  for (let drop = 0; drop < 70; drop++) {
    const angle = random() * Math.PI * 2;
    const radius = size * (0.15 + random() * 0.33);
    context.fillStyle = blood();
    context.beginPath();
    context.arc(
      centre + Math.cos(angle) * radius,
      centre + Math.sin(angle) * radius,
      1 + random() * 3.5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

/** A garden path of dark earth, rose petals heaped round the bushes at the back. */
const GARDEN_GROUND: GroundDressing = {
  wash: { colour: "#f43f5e", alpha: 0.3 },
  path: { kind: "dirt", colour: "rgba(66,24,22,0.9)", edge: "rgba(24,8,8,0.6)", width: [0.12, 0.24], wind: 0.05 },
  litter: [{ shape: "petal", colours: ["#be123c", "#9f1239", "#e11d48"], count: 220, size: 4, pile: [0, 1, 0, 0.45] }],
};
export const SOIL: NoiseLook = {
  base: [30, 18, 17],
  dark: [10, 6, 6],
  light: [58, 36, 30],
  fadeOut: true,
  dress: GARDEN_GROUND,
};
