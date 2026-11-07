import { useEffect, useMemo } from "react";
import { BufferGeometry, CanvasTexture, Color, Float32BufferAttribute } from "three";
import { seededRandom, type RandomSource } from "@/game/domain/core/random";

/** Pale ice and the deeper glacier blue under it. */
export const ICE = new Color("#dff4ff");
export const GLACIER = new Color("#60a5fa");

/**
 * One shard of ice 1 tall, standing on its origin (its foot sunk a little below): an uneven
 * six-sided column, a little wider at the foot, rising to an off-centre point; or, `broken`, ending
 * in a slanted break. Faces are left flat so each catches the light on its own.
 */
export function iceShard(random: RandomSource, radius: number, broken: boolean): BufferGeometry {
  const sides = 6;
  const shoulder = broken ? 0.75 + random() * 0.2 : 0.62 + random() * 0.15;
  const ring = (y: number, scale: number) =>
    Array.from({ length: sides }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2 + (random() - 0.5) * 0.35;
      const r = radius * scale * (0.75 + random() * 0.5);
      return [Math.cos(angle) * r, y, Math.sin(angle) * r];
    });
  const foot = ring(-0.08, 1.15);
  // A break is cut on a slant: each corner of the top at its own height.
  const top = ring(shoulder, 1).map(([x, y, z]) => [x, broken ? y + (x / radius) * 0.06 : y, z]);
  const tip = [(random() - 0.5) * radius * 0.6, 1, (random() - 0.5) * radius * 0.6];
  const positions: number[] = [];
  const triangle = (...corners: number[][]) => corners.forEach((corner) => positions.push(...corner));
  for (let index = 0; index < sides; index++) {
    const next = (index + 1) % sides;
    triangle(foot[index], top[index], foot[next]);
    triangle(foot[next], top[index], top[next]);
    if (broken)
      triangle(
        top[index],
        top.reduce((sum, [x, y, z]) => [sum[0] + x / sides, sum[1] + y / sides, sum[2] + z / sides], [0, 0, 0]),
        top[next],
      );
    else triangle(top[index], tip, top[next]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Frost cracks running out from the centre, white on transparent, branching as they go. */
export function useCrackTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 512;
    const centre = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const random = seededRandom(5);
    // A cold haze under the cracks, thickest at the blow.
    const haze = context.createRadialGradient(centre, centre, 0, centre, centre, centre);
    haze.addColorStop(0, "rgba(255,255,255,0.55)");
    haze.addColorStop(0.5, "rgba(255,255,255,0.15)");
    haze.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "white";
    context.lineCap = "round";
    const crack = (x: number, y: number, angle: number, length: number, width: number) => {
      if (length < 12 || width < 0.6) return;
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(x, y);
      let px = x;
      let py = y;
      const steps = 4;
      for (let step = 0; step < steps; step++) {
        angle += (random() - 0.5) * 0.7;
        px += (Math.cos(angle) * length) / steps;
        py += (Math.sin(angle) * length) / steps;
        context.lineTo(px, py);
      }
      context.stroke();
      crack(px, py, angle + (random() - 0.5) * 0.6, length * 0.7, width * 0.7);
      if (random() < 0.6) crack(px, py, angle + (random() < 0.5 ? -1 : 1) * 0.8, length * 0.5, width * 0.55);
    };
    const branches = 11;
    for (let index = 0; index < branches; index++) {
      crack(centre, centre, (index / branches) * Math.PI * 2 + random() * 0.4, 70 + random() * 30, 3.2);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
