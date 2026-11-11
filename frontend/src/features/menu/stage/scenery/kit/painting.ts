import type { RandomSource } from "@/game/domain/core/random";

/** A soft round smudge fading to nothing at its rim. */
export function blot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colour);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** A filled circle. */
export function dot(context: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
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

interface SpeckleLook {
  count: number;
  /** Chance a speck takes the first colour rather than the second. */
  odds: number;
  colours: readonly [string, string];
  /** Specks are 1 to 1 + `spread` pixels across. */
  spread: number;
  /** One pixel tall whatever the width: scuffs rather than grit. */
  flat?: boolean;
}

/** Grit over a whole canvas: tiny squares in two colours, the texture every painted floor ends with. */
export function speckle(context: CanvasRenderingContext2D, size: number, random: RandomSource, look: SpeckleLook) {
  const { count, odds, colours, spread, flat = false } = look;
  for (let fleck = 0; fleck < count; fleck++) {
    context.fillStyle = random() < odds ? colours[0] : colours[1];
    context.fillRect(random() * size, random() * size, 1 + random() * spread, flat ? 1 : 1 + random() * spread);
  }
}
