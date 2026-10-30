import type { RandomSource } from "@/game/domain/random";
import type { Painter } from "./textures";

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

/** Bits scattered over the ground: petals, leaves, shards… */
export interface LitterLook {
  shape: "petal" | "leaf" | "shard" | "pebble" | "coin" | "speck";
  colours: string[];
  count: number;
  /** Size in pixels on a 512 canvas. */
  size: number;
  /** Where most of them pile up, as canvas shares [x0, x1, y0, y1]; the rest fall anywhere. */
  pile?: [number, number, number, number];
}

export interface GroundDressing {
  /** Tints the whole ground towards the stage's own colour, so it stops looking neutral. */
  wash?: { colour: string; alpha: number };
  /** Soft blots of colour: moss, ash, puddles of light… */
  patches?: { colours: string[]; count: number; radius: [number, number] };
  path?: PathLook;
  litter?: LitterLook[];
  /** Cracks glowing with the stage's power (fire, void, runes). */
  glow?: { colour: string; count: number };
}

/** Paints over a ground already drawn: the canvas's top is the back of the stage, its bottom the front. */
export function dressGround(
  context: CanvasRenderingContext2D,
  size: number,
  random: RandomSource,
  look: GroundDressing,
) {
  const scale = size / 512;
  if (look.wash) {
    context.save();
    context.globalCompositeOperation = "soft-light";
    context.globalAlpha = look.wash.alpha;
    context.fillStyle = look.wash.colour;
    context.fillRect(0, 0, size, size);
    context.restore();
  }
  if (look.patches) {
    const { colours, count, radius } = look.patches;
    for (let index = 0; index < count; index++) {
      const r = (radius[0] + random() * (radius[1] - radius[0])) * scale;
      blot(context, random() * size, random() * size, r, colours[index % colours.length]);
    }
  }
  if (look.path) paintPath(context, size, random, look.path);
  for (const litter of look.litter ?? []) scatter(context, size, random, litter);
  if (look.glow) glowingCracks(context, size, random, look.glow.colour, look.glow.count);
}

/** A soft round smudge fading to nothing at its rim. */
export function blot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colour);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function paintPath(context: CanvasRenderingContext2D, size: number, random: RandomSource, path: PathLook) {
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

function scatter(context: CanvasRenderingContext2D, size: number, random: RandomSource, litter: LitterLook) {
  const scale = size / 512;
  for (let index = 0; index < litter.count; index++) {
    const piled = litter.pile && random() < 0.55;
    const [x0, x1, y0, y1] = piled ? litter.pile! : [0, 1, 0, 1];
    const x = size * (x0 + random() * (x1 - x0));
    const y = size * (y0 + random() * (y1 - y0));
    const r = litter.size * scale * (0.6 + random() * 0.8);
    const colour = litter.colours[index % litter.colours.length];
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI * 2);
    context.fillStyle = colour;
    context.beginPath();
    switch (litter.shape) {
      case "petal":
        context.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
        break;
      case "leaf":
        context.moveTo(-r, 0);
        context.quadraticCurveTo(0, -r * 0.7, r, 0);
        context.quadraticCurveTo(0, r * 0.7, -r, 0);
        break;
      case "shard":
        context.moveTo(-r, r * 0.4);
        context.lineTo(r * 0.2, -r);
        context.lineTo(r, r * 0.6);
        break;
      case "pebble":
        context.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
        break;
      case "coin":
        context.arc(0, 0, r, 0, Math.PI * 2);
        break;
      case "speck":
        context.rect(-r / 2, -r / 2, r, r);
        break;
    }
    context.fill();
    if (litter.shape === "pebble" || litter.shape === "coin") {
      // A light catching the top edge.
      context.strokeStyle = "rgba(255,255,255,0.35)";
      context.lineWidth = Math.max(0.8, r * 0.25);
      context.beginPath();
      context.arc(0, 0, r * 0.75, Math.PI * 1.1, Math.PI * 1.7);
      context.stroke();
    }
    context.restore();
  }
}

function glowingCracks(
  context: CanvasRenderingContext2D,
  size: number,
  random: RandomSource,
  colour: string,
  count: number,
) {
  context.save();
  context.lineCap = "round";
  for (let crack = 0; crack < count; crack++) {
    let [x, y] = [random() * size, random() * size];
    context.globalAlpha = 0.25;
    blot(context, x, y, 26 * (size / 512), colour);
    context.globalAlpha = 0.55 + random() * 0.35;
    context.strokeStyle = colour;
    context.lineWidth = 1 + random() * 1.6;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 7; step++) {
      x += (random() - 0.5) * 32;
      y += (random() - 0.5) * 32;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();
}

function dot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
  context.fillStyle = colour;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

/** A "#rrggbb" colour scaled by `factor` (under 1 darker, over 1 lighter), as rgb(). */
export function shade(hex: string, factor: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.min(255, Math.round(((value >> shift) & 255) * factor));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

/** `paint`, then the dressing over it: a floor painter for useCanvasTexture. Call it at module level, once. */
export function withDressing(paint: Painter, look: GroundDressing): Painter {
  return (context, size, random) => {
    paint(context, size, random);
    dressGround(context, size, random, look);
  };
}
