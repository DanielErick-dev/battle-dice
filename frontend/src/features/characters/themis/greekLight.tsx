"use client";

import { forwardRef, useMemo, type RefObject } from "react";
import { DoubleSide, PlaneGeometry, type CanvasTexture, type Color, type Group, type MeshBasicMaterial } from "three";
import { additiveMaterial } from "../shared/additive";
import { canvasTexture, createCanvas, useCanvasTexture } from "../shared/canvas";
import { useDisposable } from "../shared/disposal";

/** A ray of light: bright and narrow at its foot, widening a little as it fades out along its length. */
function rayTexture(): CanvasTexture {
  const width = 32;
  const height = 128;
  const { canvas, context } = createCanvas(width, height);
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const along = 1 - y / height;
    for (let x = 0; x < width; x++) {
      const across = Math.abs(x / (width - 1) - 0.5) * 2;
      const core = Math.max(0, 1 - across / (0.25 + 0.75 * (1 - along))) ** 2;
      const alpha = core * along ** 1.5;
      const offset = (y * width + x) * 4;
      image.data.set([255, 255, 255, Math.round(alpha * 255)], offset);
    }
  }
  context.putImageData(image, 0, 0);
  return canvasTexture(canvas);
}

/** The shared ray texture, and a unit ray (1 wide, 1 long, standing on its foot at the origin). */
export function useRayParts(glow: Color): { material: MeshBasicMaterial; geometry: PlaneGeometry } {
  const map = useCanvasTexture(rayTexture);
  const material = useDisposable(
    useMemo(() => additiveMaterial({ map, color: glow, side: DoubleSide, opacity: 0 }), [map, glow]),
  );
  const geometry = useDisposable(useMemo(() => new PlaneGeometry(1, 1).translate(0, 0.5, 0), []));
  return { material, geometry };
}

export interface RayDirection {
  /** Round the vertical, and down from it (radians). */
  turn: number;
  tilt: number;
}

/**
 * Rays of light fanning out from one point, each two crossed planes so it reads from any side. Each ray is a
 * group the caller scales (x: width, y: length) every frame through `rays`.
 */
export const LightRays = forwardRef<
  Group,
  {
    directions: readonly RayDirection[];
    material: MeshBasicMaterial;
    geometry: PlaneGeometry;
    rays: RefObject<(Group | null)[]>;
  }
>(function LightRays({ directions, material, geometry, rays }, ref) {
  return (
    <group ref={ref} visible={false}>
      {directions.map(({ turn, tilt }, index) => (
        <group key={index} rotation={[0, turn, 0]}>
          <group rotation={[tilt, 0, 0]}>
            <group
              ref={(group) => {
                rays.current[index] = group;
              }}
            >
              <mesh geometry={geometry} material={material} />
              <mesh geometry={geometry} material={material} rotation-y={Math.PI / 2} />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
});

/** `count` rays spread evenly over a whole sphere (a star of light round a hand). */
export function starDirections(count: number): RayDirection[] {
  return Array.from({ length: count }, (_, index) => ({
    turn: index * 2.39996,
    tilt: Math.acos(1 - (2 * (index + 0.5)) / count),
  }));
}

/** `count` rays fanning up and out from the ground, `minTilt`–`maxTilt` off the vertical. */
export function fanDirections(count: number, minTilt: number, maxTilt: number): RayDirection[] {
  return Array.from({ length: count }, (_, index) => ({
    turn: (index / count) * Math.PI * 2 + (index % 2) * 0.3,
    tilt: minTilt + ((index * 7) % count) * ((maxTilt - minTilt) / count),
  }));
}
