import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, SRGBColorSpace } from "three";
import type { RandomSource } from "@/game/domain/random";

/** A blank canvas (square unless given a `height`) and its 2D context, to paint a texture on. */
export function paintCanvas(
  width: number,
  height = width,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext("2d")! };
}

/** Fades what is drawn to transparent from `inner` (share of the radius) out to the rim, and wraps it as a texture. */
export function fadedGroundTexture(canvas: HTMLCanvasElement, inner = 0.5): CanvasTexture {
  const context = canvas.getContext("2d")!;
  const half = canvas.width / 2;
  const fade = context.createRadialGradient(half, half, half * inner, half, half, half);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = fade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A tuft of `blades` grass blades about `height` tall rising from its origin, each a bent strip tapering to a point,
 * shaded from `root` to `tip` (vertex colours). Sway it by rotating the mesh about its base.
 */
export function grassTuft(
  random: RandomSource,
  blades: number,
  height: number,
  root: Color,
  tip: Color,
): BufferGeometry {
  const levels = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const shade = new Color();
  for (let blade = 0; blade < blades; blade++) {
    const angle = random() * Math.PI * 2;
    const foot = random() * height * 0.12;
    const tall = height * (0.55 + random() * 0.45);
    const reach = tall * (0.15 + random() * 0.45);
    const width = height * (0.035 + random() * 0.025);
    const brightness = 0.8 + random() * 0.35;
    // The blade's flat side faces across its lean, so it bends like a strap.
    const side = [-Math.sin(angle), Math.cos(angle)];
    const ring = Array.from({ length: levels + 1 }, (_, level) => {
      const t = level / levels;
      const out = foot + reach * t * t;
      const x = Math.cos(angle) * out;
      const z = Math.sin(angle) * out;
      const y = tall * t * (1 - 0.25 * t * t);
      const w = width * (1 - t);
      shade.copy(root).lerp(tip, t).multiplyScalar(brightness);
      return {
        left: [x - side[0] * w, y, z - side[1] * w],
        right: [x + side[0] * w, y, z + side[1] * w],
        colour: shade.toArray(),
      };
    });
    for (let level = 0; level < levels; level++) {
      const a = ring[level];
      const b = ring[level + 1];
      positions.push(...a.left, ...a.right, ...b.left, ...a.right, ...b.right, ...b.left);
      colors.push(...a.colour, ...a.colour, ...b.colour, ...a.colour, ...b.colour, ...b.colour);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Places on the ring between `inner` and `outer` (radius), clear of the patch in front of the figure. */
export function scatterAround(random: RandomSource, count: number, inner: number, outer: number): [number, number][] {
  const spots: [number, number][] = [];
  while (spots.length < count) {
    const angle = random() * Math.PI * 2;
    const radius = inner + Math.sqrt(random()) * (outer - inner);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // The camera looks in from +Z: keep its line to the feet open, and the sides within the stage.
    if ((z > 0 && Math.abs(x) < 0.32) || Math.abs(x) > 0.85) continue;
    spots.push([x, z]);
  }
  return spots;
}
