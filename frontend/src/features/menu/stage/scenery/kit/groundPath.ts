import type { RandomSource } from "@/game/domain/core/random";
import { blot, dot, shade } from "./painting";

/** How a path runs from the front of the stage (canvas bottom) back to the scenery behind the figure (canvas top). */
export interface PathLook {
  kind: "slabs" | "dirt" | "boards" | "runner" | "lines";
  colour: string;
  /** Joints, edges, trim or markings. */
  edge: string;
  /** Width as a share of the canvas: at the back, and at the front (it widens towards the viewer). */
  width?: [number, number];
  /** How much it winds side to side (share of the canvas). */
  wind?: number;
}

/** Paints the path from the canvas's bottom (the stage's front) to its top. */
export function paintPath(context: CanvasRenderingContext2D, size: number, random: RandomSource, path: PathLook) {
  const [back, front] = path.width ?? [0.16, 0.26];
  const wind = path.wind ?? 0.03;
  const phase = random() * Math.PI * 2;
  /** Centre and width at `t`, 0 at the back (top) to 1 at the front (bottom). */
  const at = (t: number) => ({
    x: size * (0.5 + Math.sin(t * Math.PI * 1.3 + phase) * wind),
    width: size * (back + (front - back) * t),
  });
  const rows = 10;
  switch (path.kind) {
    case "slabs":
      for (let row = 0; row < rows; row++) {
        const { x: centre, width } = at((row + 0.5) / rows);
        const top = (row / rows) * size;
        const height = size / rows;
        context.fillStyle = path.edge;
        context.fillRect(centre - width / 2 - 2, top, width + 4, height);
        let x = centre - width / 2;
        while (x < centre + width / 2 - 4) {
          const slab = Math.min(width * (0.3 + random() * 0.35), centre + width / 2 - x);
          context.fillStyle = shade(path.colour, 0.78 + random() * 0.4);
          context.beginPath();
          context.roundRect(x + 2, top + 2, slab - 4, height - 4, 5);
          context.fill();
          x += slab;
        }
      }
      break;
    case "dirt":
      // Trodden earth: overlapping smudges along the way, darker at the edges where it meets the ground.
      for (let step = 0; step <= 60; step++) {
        const t = step / 60;
        const { x, width } = at(t);
        const y = t * size;
        blot(context, x + (random() - 0.5) * width * 0.5, y, width * 0.75, path.edge);
        blot(context, x + (random() - 0.5) * width * 0.3, y, width * 0.55, path.colour);
      }
      for (let pebble = 0; pebble < 90; pebble++) {
        const t = random();
        const { x, width } = at(t);
        dot(
          context,
          x + (random() - 0.5) * width,
          t * size,
          1 + random() * 2.2,
          shade(path.colour, 0.6 + random() * 0.7),
        );
      }
      break;
    case "boards":
      for (let row = 0; row < rows * 2; row++) {
        const { x: centre, width } = at((row + 0.5) / (rows * 2));
        const top = (row / (rows * 2)) * size;
        const height = size / (rows * 2);
        context.fillStyle = shade(path.colour, 0.8 + random() * 0.35);
        context.fillRect(centre - width / 2, top + 1, width, height - 2);
        context.fillStyle = path.edge;
        context.fillRect(centre - width / 2, top + height - 1.5, width, 1.5);
        // A nail at each end.
        dot(context, centre - width / 2 + 5, top + height / 2, 1.2, path.edge);
        dot(context, centre + width / 2 - 5, top + height / 2, 1.2, path.edge);
      }
      break;
    case "runner": {
      // A straight carpet with a trim down both sides and a pattern of diamonds.
      const width = size * (back + front) * 0.5;
      const left = size / 2 - width / 2;
      context.fillStyle = path.colour;
      context.fillRect(left, 0, width, size);
      context.fillStyle = path.edge;
      context.fillRect(left + width * 0.06, 0, width * 0.05, size);
      context.fillRect(left + width * 0.89, 0, width * 0.05, size);
      context.strokeStyle = path.edge;
      context.lineWidth = 2 * (size / 512);
      for (let y = width * 0.4; y < size; y += width * 0.8) {
        context.beginPath();
        context.moveTo(size / 2, y - width * 0.25);
        context.lineTo(size / 2 + width * 0.22, y);
        context.lineTo(size / 2, y + width * 0.25);
        context.lineTo(size / 2 - width * 0.22, y);
        context.closePath();
        context.stroke();
      }
      break;
    }
    case "lines": {
      // Painted guide lines on a deck, with chevrons pointing back to what stands behind.
      context.strokeStyle = path.edge;
      context.lineWidth = 5 * (size / 512);
      for (const side of [-1, 1]) {
        context.beginPath();
        for (let step = 0; step <= 30; step++) {
          const t = step / 30;
          const { x, width } = at(t);
          if (step === 0) context.moveTo(x + (side * width) / 2, 0);
          else context.lineTo(x + (side * width) / 2, t * size);
        }
        context.stroke();
      }
      context.fillStyle = path.colour;
      for (let row = 1; row < 7; row++) {
        const t = row / 7;
        const { x, width } = at(t);
        const y = t * size;
        context.beginPath();
        context.moveTo(x - width * 0.3, y + width * 0.12);
        context.lineTo(x, y - width * 0.08);
        context.lineTo(x + width * 0.3, y + width * 0.12);
        context.lineTo(x + width * 0.3, y + width * 0.2);
        context.lineTo(x, y);
        context.lineTo(x - width * 0.3, y + width * 0.2);
        context.closePath();
        context.fill();
      }
      break;
    }
  }
}
