import { useMemo } from "react";
import type { CanvasTexture } from "three";
import { useCanvasTexture, type Painter } from "@/features/shared/three/canvasTexture";
import { dressGround, type GroundDressing } from "./groundDressing";

export * from "@/features/shared/three/canvasTexture";

export interface NoiseLook {
  /** [r, g, b] of the base colour and of the darker and lighter flecks. */
  base: [number, number, number];
  dark: [number, number, number];
  light: [number, number, number];
  /** Fades to transparent towards the rim (a patch of ground) instead of tiling (stone). */
  fadeOut: boolean;
  /** Painted over the grain: a path, litter, a wash of colour (see dressGround). */
  dress?: GroundDressing;
}

/** A grainy texture: darker and lighter flecks over a base colour. */
export function useNoiseTexture({ base, dark, light, fadeOut, dress }: NoiseLook): CanvasTexture {
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
      if (dress) dressGround(context, size, random, dress);
    },
    [base, dark, light, dress],
  );
  return useCanvasTexture({ size: 256, draw, seed: 7, fadeFrom: fadeOut ? 0.56 : undefined, tile: true });
}
