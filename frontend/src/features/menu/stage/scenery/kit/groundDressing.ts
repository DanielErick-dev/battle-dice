import type { RandomSource } from "@/game/domain/core/random";
import { paintPath, type PathLook } from "./groundPath";
import { blot } from "./painting";
import type { Painter } from "./textures";

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

/** `paint`, then the dressing over it: a floor painter for useCanvasTexture. Call it at module level, once. */
export function withDressing(paint: Painter, look: GroundDressing): Painter {
  return (context, size, random) => {
    paint(context, size, random);
    dressGround(context, size, random, look);
  };
}
