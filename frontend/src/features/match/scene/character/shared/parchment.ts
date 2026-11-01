import { CanvasTexture } from "three";
import { seededRandom } from "@/game/domain/random";

/** A pen stroke: points on a page whose sides run from 0 to 1. */
export type Stroke = [number, number][];

/** Dried blood: the ink the Flesh Scribe writes in. */
export const BLOOD_INK = "#6b0a0f";

/**
 * A sheet of aged parchment `width`×`height` pixels: stains and fibres, edges darkened and
 * scorched, and, when given, `strokes` written on it in dried blood, a little smeared.
 */
export function drawParchment(width: number, height: number, seed: number, strokes: Stroke[] = []) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  const random = seededRandom(seed);
  context.fillStyle = "#c8b086";
  context.fillRect(0, 0, width, height);
  for (let blot = 0; blot < 40; blot++) {
    const x = random() * width;
    const y = random() * height;
    const radius = (0.03 + random() * 0.17) * width;
    const stain = context.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(96,64,32,${0.06 + random() * 0.14})`);
    stain.addColorStop(1, "rgba(96,64,32,0)");
    context.fillStyle = stain;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.strokeStyle = "rgba(80,55,30,0.12)";
  context.lineWidth = 0.6;
  for (let fibre = 0; fibre < 120; fibre++) {
    const x = random() * width;
    const y = random() * height;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 14, y + (random() - 0.5) * 4);
    context.stroke();
  }
  const edge = Math.round(width * 0.12);
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [0, 0, edge, 0, 0, 0, edge, height],
    [width, 0, width - edge, 0, width - edge, 0, edge, height],
    [0, 0, 0, edge, 0, 0, width, edge],
    [0, height, 0, height - edge, 0, height - edge, width, edge],
  ]) {
    const shade = context.createLinearGradient(x0, y0, x1, y1);
    shade.addColorStop(0, "rgba(48,26,10,0.85)");
    shade.addColorStop(1, "rgba(48,26,10,0)");
    context.fillStyle = shade;
    context.fillRect(rx, ry, rw, rh);
  }
  drawStrokes(context, strokes, BLOOD_INK, 2.6, 0.5);
  drawStrokes(context, strokes, BLOOD_INK, 2.1, 0);
  return canvas;
}

/** `strokes` drawn over the whole canvas; `smear` offsets a faint copy, like ink that bled. */
export function drawStrokes(
  context: CanvasRenderingContext2D,
  strokes: Stroke[],
  colour: string,
  lineWidth: number,
  smear = 0,
): void {
  const { width, height } = context.canvas;
  context.strokeStyle = colour;
  context.lineWidth = lineWidth;
  context.lineCap = context.lineJoin = "round";
  context.globalAlpha = smear > 0 ? 0.35 : 1;
  for (const stroke of strokes) {
    context.beginPath();
    context.moveTo(stroke[0][0] * width + smear, stroke[0][1] * height + smear * 2);
    for (const [x, y] of stroke.slice(1)) context.lineTo(x * width + smear, y * height + smear * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
}

/** A page's writing (on a 2:3 page): a sigil at the top, then lines of runes, each a few jagged strokes. */
export function pageStrokes(seed: number): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [];
  const [cx, cy] = [0.5, 0.17];
  strokes.push(ring(cx, cy, 0.14, 0.093, 32));
  const points = 3 + Math.floor(random() * 3);
  strokes.push(
    Array.from({ length: points + 1 }, (_, index): [number, number] => {
      const angle = ((index * 2) / points) * Math.PI * 2 - Math.PI / 2;
      return [cx + Math.cos(angle) * 0.115, cy + Math.sin(angle) * 0.077];
    }),
  );
  for (let y = 0.33; y < 0.88; y += 0.068) {
    for (let x = 0.15; x < 0.84; x += 0.057 + random() * 0.026) {
      if (random() < 0.12) {
        x += 0.04;
        continue;
      }
      const marks = 2 + Math.floor(random() * 2);
      for (let mark = 0; mark < marks; mark++) {
        strokes.push([
          [x + random() * 0.042, y + random() * 0.043],
          [x + random() * 0.042, y + random() * 0.043],
        ]);
      }
    }
  }
  return strokes;
}

/** A closed ring round (cx, cy), `rx` by `ry` across, in `segments` straight runs. */
export function ring(cx: number, cy: number, rx: number, ry = rx, segments = 48): Stroke {
  return Array.from({ length: segments + 1 }, (_, index): [number, number] => {
    const angle = (index / segments) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

/**
 * Writing that appears as it's written: a transparent canvas `width`×`height` on which
 * `drawUpTo(progress)` draws that share of `strokes` (white, to be tinted by a material), and
 * `penAt(progress)` says where the pen is then (0 to 1 across and down the page).
 */
export function createWriting(strokes: Stroke[], width: number, height: number, lineWidth: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  const total = strokes.reduce((sum, stroke) => sum + stroke.length - 1, 0);
  const texture = new CanvasTexture(canvas);
  const cursor = { drawn: -1 };
  const visit = (progress: number, draw: (stroke: Stroke, points: number) => void) => {
    let left = Math.round(Math.min(1, Math.max(0, progress)) * total);
    for (const stroke of strokes) {
      if (left <= 0) break;
      draw(stroke, Math.min(left, stroke.length - 1));
      left -= stroke.length - 1;
    }
  };
  const drawUpTo = (progress: number) => {
    const target = Math.round(Math.min(1, Math.max(0, progress)) * total);
    if (target === cursor.drawn) return;
    cursor.drawn = target;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "white";
    context.lineCap = context.lineJoin = "round";
    context.lineWidth = lineWidth;
    visit(progress, (stroke, points) => {
      context.beginPath();
      context.moveTo(stroke[0][0] * width, stroke[0][1] * height);
      for (const [x, y] of stroke.slice(1, 1 + points)) context.lineTo(x * width, y * height);
      context.stroke();
    });
    texture.needsUpdate = true;
  };
  const penAt = (progress: number): [number, number] => {
    let pen: [number, number] = strokes[0]?.[0] ?? [0.5, 0.5];
    visit(progress, (stroke, points) => (pen = stroke[points]));
    return pen;
  };
  return { texture, drawUpTo, penAt };
}
