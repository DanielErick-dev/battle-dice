"use client";

import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, type Color, type Texture } from "three";
import { useDisposal } from "./dispose";
import { HOT_GLOW } from "./materials";

/** A point cloud's buffers: positions (zeros unless given) and, when `coloured`, a colour per point. */
export function pointBuffers(
  count: number,
  coloured: boolean,
  positions = new Float32Array(count * 3),
): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  if (coloured) geometry.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
  return geometry;
}

/** Buffers for `count` points moved every frame, freed with the component. */
export function usePointBuffers(count: number, coloured: boolean): BufferGeometry {
  const geometry = useMemo(() => pointBuffers(count, coloured), [count, coloured]);
  useDisposal(geometry);
  return geometry;
}

/** Glowing dots (sparks, fireflies, bubbles): one colour for all, or each point's own ("vertex"). */
export function GlowPoints({
  geometry,
  map,
  size,
  colour,
  renderOrder = 0,
}: {
  geometry: BufferGeometry;
  map: Texture;
  size: number;
  colour: Color | "vertex";
  renderOrder?: number;
}) {
  return (
    <points geometry={geometry} renderOrder={renderOrder}>
      {colour === "vertex" ? (
        <pointsMaterial map={map} vertexColors size={size} {...HOT_GLOW} />
      ) : (
        <pointsMaterial map={map} color={colour} size={size} {...HOT_GLOW} />
      )}
    </points>
  );
}
