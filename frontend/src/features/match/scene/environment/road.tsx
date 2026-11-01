"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Vector3 } from "three";
import { useCanvasTexture, type Painter } from "@/features/menu/stage/scenery/kit/textures";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "../boardLayout";

/** Half the road's width: wider than the slabs, its edges fading into the grass. */
const ROAD_HALF_WIDTH = 1.9;
/** World units along the road per repeat of its texture. */
const ROAD_REPEAT = 4;
/** Road points per tile along the curve. */
const ROAD_STEPS = 6;

/**
 * The road the slabs are set in: a ribbon along a smooth curve through the trail, following the
 * ground, painted by the map (trodden earth on the island, worn flagstones in the dungeon…).
 */
export function TrailRoad({
  trail,
  heightAt,
  paint,
}: {
  trail: readonly Vec3[];
  /** The ground's height under the road (it lies just over it). */
  heightAt: (x: number, z: number) => number;
  /** Its surface, across the canvas (x) and along it (y), fading out at the sides. */
  paint: Painter;
}) {
  const texture = useCanvasTexture({ size: 256, height: 512, draw: paint, seed: 17, tile: true });
  const geometry = useMemo(() => {
    // Running on under the start's plaza and out through the village gate behind it.
    const [first, second] = [trail[0], trail[1] ?? trail[0]];
    const [dx, dz] = [second[0] - first[0], second[2] - first[2]];
    const length = Math.hypot(dx, dz) || 1;
    const lead = START_PLAZA + TILE_PITCH * 1.5;
    const curve = new CatmullRomCurve3(
      [
        new Vector3(first[0] - (dx / length) * lead, 0, first[2] - (dz / length) * lead),
        ...trail.map(([x, , z]) => new Vector3(x, 0, z)),
      ],
      false,
      "centripetal",
    );
    const steps = Math.max(2, trail.length * ROAD_STEPS);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let walked = 0;
    let last: Vector3 | null = null;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      if (last) walked += point.distanceTo(last);
      last = point;
      for (const side of [-1, 1]) {
        const [x, z] = [point.x - tangent.z * ROAD_HALF_WIDTH * side, point.z + tangent.x * ROAD_HALF_WIDTH * side];
        positions.push(x, heightAt(x, z) + 0.015, z);
        uvs.push(side < 0 ? 0 : 1, walked / ROAD_REPEAT);
      }
      if (step > 0) {
        const at = step * 2;
        indices.push(at - 2, at, at - 1, at - 1, at, at + 1);
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
    // The height function stands for the map, which doesn't change under a road.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow renderOrder={1}>
      <meshStandardMaterial
        map={texture}
        transparent
        depthWrite={false}
        roughness={1}
        polygonOffset
        polygonOffsetFactor={-2}
        side={DoubleSide}
      />
    </mesh>
  );
}

/** Trodden earth across the canvas (x across the road, y along it), ruts, pebbles, ragged grassy edges. */
export const paintDirtRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#56473a";
  context.fillRect(0, 0, size, height);
  for (let index = 0; index < 260; index++) {
    const [x, y, r] = [random() * size, random() * height, 6 + random() * 22];
    const blot = context.createRadialGradient(x, y, 0, x, y, r);
    const dark = random() < 0.5;
    blot.addColorStop(0, dark ? "rgba(40,30,22,0.4)" : "rgba(112,96,78,0.25)");
    blot.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = blot;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Two ruts worn by carts, a little wavering.
  for (const rut of [0.33, 0.67]) {
    context.strokeStyle = "rgba(52,38,26,0.45)";
    context.lineWidth = 14;
    context.beginPath();
    for (let y = 0; y <= height; y += 16) {
      const x = size * rut + Math.sin((y / height) * Math.PI * 4 + rut * 9) * 4;
      if (y === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let index = 0; index < 500; index++) {
    const shade = 80 + Math.floor(random() * 60);
    context.fillStyle = `rgb(${shade},${shade - 6},${shade - 14})`;
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * height,
      1 + random() * 3,
      1 + random() * 2.2,
      random() * 3,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  // Grass blades fraying in from both edges.
  for (let index = 0; index < 700; index++) {
    const left = random() < 0.5;
    const reach = random() ** 2 * size * 0.28;
    const x = left ? reach : size - reach;
    const y = random() * height;
    context.strokeStyle = random() < 0.5 ? "rgba(42,60,46,0.85)" : "rgba(56,72,52,0.8)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 6, y - 4 - random() * 8);
    context.stroke();
  }
  // Fades out at the edges (alpha), raggedly, so the road melts into the grass.
  context.globalCompositeOperation = "destination-in";
  const fade = context.createLinearGradient(0, 0, size, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.18, "rgba(0,0,0,1)");
  fade.addColorStop(0.82, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, height);
  context.globalCompositeOperation = "source-over";
};

/** Worn flagstones across the canvas, joints dark with grime, fading out at the sides (the dungeon's road). */
export const paintFlagstoneRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#3a3740";
  context.fillRect(0, 0, size, height);
  for (let y = 0; y < height;) {
    const row = 34 + random() * 26;
    for (let x = 0; x < size;) {
      const width = 40 + random() * 50;
      const shade = 70 + Math.floor(random() * 40);
      context.fillStyle = `rgb(${shade},${shade - 4},${shade + 6})`;
      context.fillRect(x + 2, y + 2, width - 4, row - 4);
      x += width;
    }
    y += row;
  }
  for (let index = 0; index < 120; index++) {
    const [x, y, r] = [random() * size, random() * height, 8 + random() * 20];
    const grime = context.createRadialGradient(x, y, 0, x, y, r);
    grime.addColorStop(0, "rgba(20,16,14,0.35)");
    grime.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grime;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  fadeSides(context, size, height);
};

/** Cracked asphalt, faded centre line and weeds in the cracks (the wasteland's road). */
export const paintCrackedRoad: Painter = (context, size, random) => {
  const height = size * 2;
  context.fillStyle = "#3b3a3d";
  context.fillRect(0, 0, size, height);
  for (let index = 0; index < 900; index++) {
    const shade = 40 + Math.floor(random() * 40);
    context.fillStyle = `rgba(${shade},${shade},${shade + 4},0.5)`;
    context.fillRect(random() * size, random() * height, 2, 2);
  }
  // The centre line, worn away in places.
  context.fillStyle = "rgba(214,190,90,0.55)";
  for (let y = 0; y < height; y += 64) if (random() > 0.25) context.fillRect(size / 2 - 4, y, 8, 34);
  context.lineCap = "round";
  for (let crack = 0; crack < 14; crack++) {
    let [x, y] = [random() * size, random() * height];
    context.strokeStyle = "rgba(15,14,16,0.7)";
    context.lineWidth = 1.5 + random() * 2;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 50;
      y += (random() - 0.5) * 50;
      context.lineTo(x, y);
    }
    context.stroke();
    // Weeds pushing through.
    context.fillStyle = "rgba(90,110,60,0.8)";
    context.fillRect(x - 2, y - 4, 4, 6);
  }
  fadeSides(context, size, height);
};

/** Erases towards the canvas's left and right edges, so the road melts into the ground either side. */
function fadeSides(context: CanvasRenderingContext2D, size: number, height: number) {
  context.globalCompositeOperation = "destination-in";
  const fade = context.createLinearGradient(0, 0, size, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.16, "rgba(0,0,0,1)");
  fade.addColorStop(0.84, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, height);
  context.globalCompositeOperation = "source-over";
}
