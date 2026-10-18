import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { seededRandom, type RandomSource } from "@/game/domain/random";

/** Paints the canvas (`size` is its width); module-level so a texture is drawn once. */
export type Painter = (context: CanvasRenderingContext2D, size: number, random: RandomSource) => void;

export interface CanvasLook {
  /** Width of the canvas in pixels; also its height unless `height` is given. */
  size: number;
  height?: number;
  draw: Painter;
  /** Seed of the `random` handed to `draw`. */
  seed?: number;
  /** Share of the radius kept opaque before fading to transparent at the rim; omitted, no fade. */
  fadeFrom?: number;
  /** Tiles instead of clamping, for textures scrolled or repeated across a surface. */
  tile?: boolean;
  /** Data (masks, alpha, white tint masks) rather than colour: left out of the sRGB conversion. */
  linear?: boolean;
}

/** Erases the canvas towards its rim, so a ground patch thins away instead of ending in a hard circle. */
export function fadeRim(context: CanvasRenderingContext2D, size: number, from: number) {
  const fade = context.createRadialGradient(size / 2, size / 2, (size / 2) * from, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = fade;
  context.fillRect(0, 0, size, size);
  context.restore();
}

/** A texture painted on a fresh canvas; the caller disposes it. */
export function paintTexture({
  size,
  height = size,
  draw,
  seed = 1,
  fadeFrom,
  tile = false,
  linear = false,
}: CanvasLook): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  draw(context, size, seededRandom(seed));
  if (fadeFrom !== undefined) fadeRim(context, size, fadeFrom);
  const texture = new CanvasTexture(canvas);
  if (tile) texture.wrapS = texture.wrapT = RepeatWrapping;
  if (!linear) texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A texture painted once on a canvas, disposed with the component. */
export function useCanvasTexture({ size, height, draw, seed, fadeFrom, tile, linear }: CanvasLook): CanvasTexture {
  const texture = useMemo(
    () => paintTexture({ size, height, draw, seed, fadeFrom, tile, linear }),
    [size, height, draw, seed, fadeFrom, tile, linear],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Several textures painted once, disposed with the component; `looks` must be stable (module-level). */
export function useCanvasTextures(looks: readonly CanvasLook[]): CanvasTexture[] {
  const textures = useMemo(() => looks.map(paintTexture), [looks]);
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);
  return textures;
}

export interface NoiseLook {
  /** [r, g, b] of the base colour and of the darker and lighter flecks. */
  base: [number, number, number];
  dark: [number, number, number];
  light: [number, number, number];
  /** Fades to transparent towards the rim (a patch of ground) instead of tiling (stone). */
  fadeOut: boolean;
}

/** A grainy texture: darker and lighter flecks over a base colour. */
export function useNoiseTexture({ base, dark, light, fadeOut }: NoiseLook): CanvasTexture {
  const draw = useMemo<Painter>(
    () => (context, size, random) => {
      context.fillStyle = `rgb(${base.join(",")})`;
      context.fillRect(0, 0, size, size);
      for (let index = 0; index < 2600; index++) {
        const [r, g, b] = random() < 0.55 ? dark : light;
        context.fillStyle = `rgba(${r},${g},${b},${0.25 + random() * 0.45})`;
        const radius = 0.6 + random() * (random() < 0.08 ? 6 : 2.2);
        context.beginPath();
        context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
        context.fill();
      }
    },
    [base, dark, light],
  );
  return useCanvasTexture({ size: 256, draw, seed: 7, fadeFrom: fadeOut ? 0.56 : undefined, tile: true });
}
