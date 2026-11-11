import type { Painter } from "@/features/shared/three/canvasTexture";
import { fadeSides } from "../shared/roadPaint";

/** Big worn flagstones in rows, dark joints and grime (tiled across the hall's floor). */
export const paintHallFloor: Painter = (context, size, random) => {
  context.fillStyle = "#2b2830";
  context.fillRect(0, 0, size, size);
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * size;
    const height = size / rows;
    let x = -random() * 60;
    while (x < size) {
      const width = 60 + random() * 70;
      const shade = 58 + Math.floor(random() * 30);
      context.fillStyle = `rgb(${shade},${shade - 3},${shade + 5})`;
      context.fillRect(x + 3, y + 3, width - 6, height - 6);
      x += width;
    }
  }
  for (let index = 0; index < 90; index++) {
    const [x, y, r] = [random() * size, random() * size, 10 + random() * 30];
    const grime = context.createRadialGradient(x, y, 0, x, y, r);
    grime.addColorStop(0, "rgba(14,12,10,0.35)");
    grime.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grime;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
};

/** Worn flagstones across the canvas, joints dark with grime, fading out at the sides (the dungeon's road). */
export const paintFlagstoneRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#3a3740";
  context.fillRect(0, 0, size, height);
  for (let y = 0; y < height;) {
    const row = 34 + random() * 26;
    for (let x = 0; x < size;) {
      const width = 40 + random() * 50;
      const shade = 70 + Math.floor(random() * 40);
      context.fillStyle = `rgb(${shade},${shade - 4},${shade + 6})`;
      context.fillRect(x + 2, y + 2, width - 4, row - 4);
      x += width;
    }
    y += row;
  }
  for (let index = 0; index < 120; index++) {
    const [x, y, r] = [random() * size, random() * height, 8 + random() * 20];
    const grime = context.createRadialGradient(x, y, 0, x, y, r);
    grime.addColorStop(0, "rgba(20,16,14,0.35)");
    grime.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grime;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  fadeSides(context, size, height);
};
