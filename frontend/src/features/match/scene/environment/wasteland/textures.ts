import type { Painter } from "@/features/shared/three/canvasTexture";
import { fadeSides } from "../shared/roadPaint";

/** Dry earth split by cracks, patches of ash and scorch (tiled across the ground). */
export const paintCrackedEarth: Painter = (context, size, random) => {
  context.fillStyle = "#6e5a48";
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 160; index++) {
    const [x, y, r] = [random() * size, random() * size, 12 + random() * 40];
    const patch = context.createRadialGradient(x, y, 0, x, y, r);
    patch.addColorStop(0, random() < 0.5 ? "rgba(40,32,28,0.35)" : "rgba(150,130,110,0.25)");
    patch.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = patch;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  context.lineCap = "round";
  for (let crack = 0; crack < 40; crack++) {
    let [x, y] = [random() * size, random() * size];
    context.strokeStyle = "rgba(30,22,18,0.6)";
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      x += (random() - 0.5) * 60;
      y += (random() - 0.5) * 60;
      context.lineTo(x, y);
    }
    context.stroke();
  }
};

/** Cracked asphalt, faded centre line and weeds in the cracks (the wasteland's road). */
export const paintCrackedRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#3b3a3d";
  context.fillRect(0, 0, size, height);
  for (let index = 0; index < 900; index++) {
    const shade = 40 + Math.floor(random() * 40);
    context.fillStyle = `rgba(${shade},${shade},${shade + 4},0.5)`;
    context.fillRect(random() * size, random() * height, 2, 2);
  }
  // The centre line, worn away in places.
  context.fillStyle = "rgba(214,190,90,0.55)";
  for (let y = 0; y < height; y += 64) if (random() > 0.25) context.fillRect(size / 2 - 4, y, 8, 34);
  context.lineCap = "round";
  for (let crack = 0; crack < 14; crack++) {
    let [x, y] = [random() * size, random() * height];
    context.strokeStyle = "rgba(15,14,16,0.7)";
    context.lineWidth = 1.5 + random() * 2;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 50;
      y += (random() - 0.5) * 50;
      context.lineTo(x, y);
    }
    context.stroke();
    // Weeds pushing through.
    context.fillStyle = "rgba(90,110,60,0.8)";
    context.fillRect(x - 2, y - 4, 4, 6);
  }
  fadeSides(context, size, height);
};
