import type { Painter } from "@/features/shared/three/canvasTexture";
import { fadeSides } from "../shared/roadPaint";

/** Trodden earth across the canvas (x across the road, y along it), ruts, pebbles, ragged grassy edges. */
export const paintDirtRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#56473a";
  context.fillRect(0, 0, size, height);
  for (let index = 0; index < 260; index++) {
    const [x, y, r] = [random() * size, random() * height, 6 + random() * 22];
    const blot = context.createRadialGradient(x, y, 0, x, y, r);
    const dark = random() < 0.5;
    blot.addColorStop(0, dark ? "rgba(40,30,22,0.4)" : "rgba(112,96,78,0.25)");
    blot.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = blot;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Two ruts worn by carts, a little wavering.
  for (const rut of [0.33, 0.67]) {
    context.strokeStyle = "rgba(52,38,26,0.45)";
    context.lineWidth = 14;
    context.beginPath();
    for (let y = 0; y <= height; y += 16) {
      const x = size * rut + Math.sin((y / height) * Math.PI * 4 + rut * 9) * 4;
      if (y === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let index = 0; index < 500; index++) {
    const shade = 80 + Math.floor(random() * 60);
    context.fillStyle = `rgb(${shade},${shade - 6},${shade - 14})`;
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * height,
      1 + random() * 3,
      1 + random() * 2.2,
      random() * 3,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  // Grass blades fraying in from both edges.
  for (let index = 0; index < 700; index++) {
    const left = random() < 0.5;
    const reach = random() ** 2 * size * 0.28;
    const x = left ? reach : size - reach;
    const y = random() * height;
    context.strokeStyle = random() < 0.5 ? "rgba(42,60,46,0.85)" : "rgba(56,72,52,0.8)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 6, y - 4 - random() * 8);
    context.stroke();
  }
  // A wider, ragged fade than the other roads, so it melts into the grass.
  fadeSides(context, size, height, [0.18, 0.82]);
};
