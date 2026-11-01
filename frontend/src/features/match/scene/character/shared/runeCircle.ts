"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture } from "three";

/** White rune circle (tinted by the material): two rings, a band of glyphs and a star. */
export function useRuneTexture() {
  const texture = useMemo(() => {
    const result = new CanvasTexture(drawRuneCircle());
    result.anisotropy = 4;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function drawRuneCircle(): HTMLCanvasElement {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const centre = size / 2;
  context.translate(centre, centre);
  context.strokeStyle = "white";
  context.lineCap = "round";

  const circle = (radius: number, width: number) => {
    context.lineWidth = width;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  };
  circle(centre * 0.97, 5);
  circle(centre * 0.8, 3);
  circle(centre * 0.52, 3);

  // Glyphs between the outer rings, from a fixed seed so they're the same every visit.
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const glyphs = 24;
  context.lineWidth = 4;
  for (let index = 0; index < glyphs; index += 1) {
    context.save();
    context.rotate((index / glyphs) * Math.PI * 2);
    context.translate(0, -centre * 0.885);
    context.beginPath();
    context.moveTo(0, -14);
    context.lineTo(0, 14);
    for (let stroke = 0; stroke < 2; stroke += 1) {
      const y = (random() - 0.5) * 24;
      context.moveTo(0, y);
      context.lineTo((random() < 0.5 ? -1 : 1) * (6 + random() * 6), y + (random() - 0.5) * 16);
    }
    context.stroke();
    context.restore();
  }

  // Six-pointed star inside the inner ring.
  context.lineWidth = 3;
  for (const offset of [0, Math.PI / 3]) {
    context.beginPath();
    for (let corner = 0; corner <= 3; corner += 1) {
      const angle = offset + (corner / 3) * Math.PI * 2 - Math.PI / 2;
      const point = [Math.cos(angle) * centre * 0.52, Math.sin(angle) * centre * 0.52] as const;
      if (corner === 0) context.moveTo(...point);
      else context.lineTo(...point);
    }
    context.stroke();
  }

  return canvas;
}
