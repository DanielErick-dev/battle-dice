import { blot, speckle } from "../kit/painting";
import type { Painter } from "../kit/textures";

/**
 * The shrine's ground: a path of dark red flagstones running back to the torii (the canvas's top is the back) through
 * ash and charred earth, crimson petals blown off the tree (thickest on its side), scorch marks and glowing cracks.
 */
export const paintShrineGround: Painter = (context, size, random) => {
  context.fillStyle = "#1c0f0c";
  context.fillRect(0, 0, size, size);
  // Ash drifts and charred patches.
  for (let index = 0; index < 120; index++) {
    const ash = random() < 0.5;
    blot(
      context,
      random() * size,
      random() * size,
      14 + random() * 36,
      ash ? "rgba(92,80,74,0.35)" : "rgba(40,10,8,0.6)",
    );
  }
  // The path: rows of uneven slabs, narrowing towards the torii.
  const rows = 9;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * size;
    const width = size * (0.16 + (row / rows) * 0.1);
    const height = size / rows;
    let x = size / 2 - width / 2;
    while (x < size / 2 + width / 2) {
      const slab = width * (0.3 + random() * 0.35);
      const shade = 0.75 + random() * 0.4;
      context.fillStyle = `rgb(${86 * shade},${44 * shade},${38 * shade})`;
      context.beginPath();
      context.roundRect(x + 2, y + 2, Math.min(slab, size / 2 + width / 2 - x) - 4, height - 4, 5);
      context.fill();
      x += slab;
    }
  }
  speckle(context, size, random, {
    count: 3000,
    odds: 0.6,
    colours: ["rgba(8,4,4,0.45)", "rgba(150,120,110,0.18)"],
    spread: 2,
  });
  for (let scorch = 0; scorch < 8; scorch++) {
    blot(context, random() * size, random() * size, 30 + random() * 60, "rgba(4,1,1,0.8)");
  }
  // Petals: little crimson ellipses, piling up under the tree (back right).
  for (let petal = 0; petal < 520; petal++) {
    const underTree = random() < 0.55;
    const x = underTree ? size * (0.62 + random() * 0.38) : random() * size;
    const y = underTree ? size * random() * 0.5 : random() * size;
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.fillStyle = ["rgba(196,22,40,0.85)", "rgba(150,12,30,0.85)", "rgba(230,60,70,0.8)"][petal % 3];
    context.beginPath();
    context.ellipse(0, 0, 2.6 + random() * 2, 1.4 + random(), 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  // Cracks still glowing from the fire, with a soft halo.
  context.lineCap = "round";
  for (let crack = 0; crack < 16; crack++) {
    let [x, y] = [random() * size, random() * size];
    blot(context, x, y, 26, "rgba(255,70,20,0.18)");
    context.strokeStyle = `rgba(255,${80 + random() * 60},30,${0.5 + random() * 0.35})`;
    context.lineWidth = 1 + random() * 1.8;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 7; step++) {
      x += (random() - 0.5) * 32;
      y += (random() - 0.5) * 32;
      context.lineTo(x, y);
    }
    context.stroke();
  }
};

/** A flame's teardrop, white and soft-edged, its base at the bottom of the square. */
export function paintFlame(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createRadialGradient(size / 2, size * 0.68, 0, size / 2, size * 0.6, size * 0.42);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.65)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(size / 2, size * 0.04);
  context.bezierCurveTo(size * 0.62, size * 0.35, size * 0.86, size * 0.55, size * 0.8, size * 0.78);
  context.bezierCurveTo(size * 0.74, size * 0.98, size * 0.26, size * 0.98, size * 0.2, size * 0.78);
  context.bezierCurveTo(size * 0.14, size * 0.55, size * 0.38, size * 0.35, size / 2, size * 0.04);
  context.fill();
}
