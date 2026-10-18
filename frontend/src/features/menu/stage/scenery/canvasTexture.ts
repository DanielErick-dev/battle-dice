import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export interface CanvasLook {
  /** Side of the square canvas, in pixels. */
  size: number;
  /** Paints the canvas; keep it a module-level function so the texture is drawn once. */
  draw: (context: CanvasRenderingContext2D, size: number) => void;
  /** Share of the radius kept opaque before fading to transparent at the rim; omitted, no fade. */
  fadeFrom?: number;
  /** Tiles instead of clamping, for textures scrolled or repeated across a surface. */
  tile?: boolean;
  /** Data (masks, alpha) rather than colour: left out of the sRGB conversion. */
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

/** A texture painted once on a canvas, disposed with the component. */
export function useCanvasTexture({ size, draw, fadeFrom, tile = false, linear = false }: CanvasLook): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    draw(context, size);
    if (fadeFrom !== undefined) fadeRim(context, size, fadeFrom);
    const result = new CanvasTexture(canvas);
    if (tile) result.wrapS = result.wrapT = RepeatWrapping;
    if (!linear) result.colorSpace = SRGBColorSpace;
    return result;
  }, [size, draw, fadeFrom, tile, linear]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
