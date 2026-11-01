import { useEffect, useMemo } from "react";
import { CanvasTexture, PlaneGeometry, SRGBColorSpace } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { createWriting, drawParchment, drawStrokes, pageStrokes, ring, type Stroke } from "../shared/parchment";
import { SCROLLS } from "./introLayout";

/** The writing on the page in the air. */
export const PAGE_STROKES = pageStrokes(61);
/**
 * The ritual circle on the floor (on a 1×1 square): a double ring, a seven-pointed star, four
 * small rings for his four seals with a mark in each, and runes between the rings.
 */
export const CIRCLE_STROKES: Stroke[] = (() => {
  const random = seededRandom(43);
  const strokes: Stroke[] = [ring(0.5, 0.5, 0.47), ring(0.5, 0.5, 0.42)];
  strokes.push(
    Array.from({ length: 8 }, (_, index): [number, number] => {
      const angle = ((index * 3) / 7) * Math.PI * 2 - Math.PI / 2;
      return [0.5 + Math.cos(angle) * 0.4, 0.5 + Math.sin(angle) * 0.4];
    }),
  );
  strokes.push(ring(0.5, 0.5, 0.2, 0.2, 32));
  for (let seal = 0; seal < 4; seal++) {
    const angle = (seal / 4) * Math.PI * 2 + Math.PI / 4;
    const [x, y] = [0.5 + Math.cos(angle) * 0.31, 0.5 + Math.sin(angle) * 0.31];
    strokes.push(ring(x, y, 0.045, 0.045, 20), [
      [x - 0.025, y],
      [x + 0.025, y],
    ]);
  }
  for (let rune = 0; rune < 28; rune++) {
    const angle = (rune / 28) * Math.PI * 2;
    const [x, y] = [0.5 + Math.cos(angle) * 0.445, 0.5 + Math.sin(angle) * 0.445];
    strokes.push(
      Array.from({ length: 3 }, (): [number, number] => [x + (random() - 0.5) * 0.02, y + (random() - 0.5) * 0.02]),
    );
  }
  return strokes;
})();

/** Writing that appears as it's written (see createWriting). */
export function useWriting(strokes: Stroke[], width: number, height: number, lineWidth: number) {
  const writing = useMemo(() => createWriting(strokes, width, height, lineWidth), [strokes, width, height, lineWidth]);
  useEffect(() => () => writing.texture.dispose(), [writing]);
  return writing;
}

/** A blank sheet of aged parchment. */
export function useParchment(width: number, height: number, seed: number): CanvasTexture {
  const texture = useMemo(() => {
    const result = new CanvasTexture(drawParchment(width, height, seed));
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [width, height, seed]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** The four scrolls' pages, each with its own writing, and apart a mask of its runes for their glow. */
export function usePages() {
  const pages = useMemo(
    () =>
      SCROLLS.map((_, index) => {
        const strokes = pageStrokes(101 + index * 17);
        const parchment = new CanvasTexture(drawParchment(192, 282, 101 + index * 17, strokes));
        parchment.colorSpace = SRGBColorSpace;
        const mask = document.createElement("canvas");
        mask.width = 192;
        mask.height = 282;
        const context = mask.getContext("2d")!;
        context.shadowColor = "white";
        context.shadowBlur = 4;
        drawStrokes(context, strokes, "white", 2.2);
        return { parchment, runes: new CanvasTexture(mask) };
      }),
    [],
  );
  useEffect(
    () => () =>
      pages.forEach(({ parchment, runes }) => {
        parchment.dispose();
        runes.dispose();
      }),
    [pages],
  );
  return pages;
}

/** A sheet hanging down from its top edge (at the origin), curling a little back at the sides. */
export function curledSheet(width: number, height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height, 12, 6);
  geometry.translate(0, -height / 2, 0);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const across = position.getX(index) / (width / 2);
    const down = -position.getY(index) / height;
    position.setZ(index, -0.018 * across * across + 0.006 * Math.sin(down * Math.PI * 2));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * What burns first: cloudy noise, lowest at the edges, so as the alpha test rises the sheet is
 * eaten from its edges inwards in ragged holes.
 */
export function useBurnMask(): CanvasTexture {
  const texture = useMemo(() => {
    const width = 96;
    const height = 140;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "rgb(150,150,150)";
    context.fillRect(0, 0, width, height);
    const random = seededRandom(5);
    for (let blot = 0; blot < 70; blot++) {
      const x = random() * width;
      const y = random() * height;
      const radius = 6 + random() * 22;
      const light = random() < 0.5;
      const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
      cloud.addColorStop(0, light ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)");
      cloud.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = cloud;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    // Edges lowest.
    const image = context.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const edge = Math.min(x, width - 1 - x, y, height - 1 - y) / 26;
        const offset = (y * width + x) * 4;
        const value = (image.data[offset] / 255) * (0.35 + 0.65 * Math.min(1, edge));
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = Math.min(250, value * 255);
      }
    }
    context.putImageData(image, 0, 0);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
