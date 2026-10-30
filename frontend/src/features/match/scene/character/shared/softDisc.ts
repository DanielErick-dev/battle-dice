import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";

/** A soft round disc fading out to its rim, white on transparent: for shadows, fog and glows. */
export function useSoftDisc(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
