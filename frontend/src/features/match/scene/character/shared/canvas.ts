import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useDisposable } from "./disposal";

/** A blank canvas `width`×`height` and its 2D context, for drawing a texture by hand. */
export function createCanvas(
  width: number,
  height = width,
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext("2d")! };
}

/** A texture of `canvas`; `srgb` for painted colours (masks and white glows stay linear). */
export function canvasTexture(canvas: HTMLCanvasElement, srgb = false): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A texture made once by `create` (a module-level function, so it never changes), freed on unmount. */
export function useCanvasTexture(create: () => CanvasTexture): CanvasTexture {
  return useDisposable(useMemo(() => create(), [create]));
}
