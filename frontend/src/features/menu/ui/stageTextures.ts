import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { seededRandom } from "@/game/domain/random";

export interface NoiseLook {
  /** Base colour and the darkest and lightest flecks, as [r, g, b]. */
  base: [number, number, number];
  dark: [number, number, number];
  light: [number, number, number];
  /** Fades to transparent towards the rim (the patch of earth) rather than tiling (stone). */
  fadeOut: boolean;
}

/** A grainy texture drawn once: clumps of darker and lighter flecks over a base colour. */
export function useNoiseTexture({ base, dark, light, fadeOut }: NoiseLook): CanvasTexture {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = `rgb(${base.join(",")})`;
    context.fillRect(0, 0, size, size);
    const random = seededRandom(7);
    for (let index = 0; index < 2600; index++) {
      const [r, g, b] = random() < 0.55 ? dark : light;
      context.fillStyle = `rgba(${r},${g},${b},${0.25 + random() * 0.45})`;
      const radius = 0.6 + random() * (random() < 0.08 ? 6 : 2.2);
      context.beginPath();
      context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
      context.fill();
    }
    if (fadeOut) {
      const fade = context.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size / 2);
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      context.globalCompositeOperation = "destination-in";
      context.fillStyle = fade;
      context.fillRect(0, 0, size, size);
    }
    const result = new CanvasTexture(canvas);
    result.wrapS = result.wrapT = RepeatWrapping;
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [base, dark, light, fadeOut]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
