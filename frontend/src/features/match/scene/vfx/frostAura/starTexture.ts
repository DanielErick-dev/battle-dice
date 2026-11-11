import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";

/** A four-pointed glint of light: two thin crossed rays over a soft core, white on transparent. */
export function useStarTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 64;
    const centre = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const core = context.createRadialGradient(centre, centre, 0, centre, centre, size * 0.22);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = core;
    context.fillRect(0, 0, size, size);
    for (const [width, height] of [
      [size, 3],
      [3, size],
    ]) {
      const ray = context.createRadialGradient(centre, centre, 0, centre, centre, size / 2);
      ray.addColorStop(0, "rgba(255,255,255,0.95)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = ray;
      context.fillRect(centre - width / 2, centre - height / 2, width, height);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
