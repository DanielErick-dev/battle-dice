"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { useDisposable } from "@/features/characters/shared/disposal";
import { useCanvasTexture, type Painter } from "@/features/shared/three/canvasTexture";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { roadRibbon } from "./roadRibbon";

/** The road the slabs are set in, following the ground and painted by the map. */
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
  const geometry = useDisposable(
    useMemo(() => {
      const { positions, uvs, indices } = roadRibbon(trail, heightAt);
      const result = new BufferGeometry();
      result.setAttribute("position", new Float32BufferAttribute(positions, 3));
      result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
      result.setIndex(indices);
      result.computeVertexNormals();
      return result;
      // The height function stands for the map, which doesn't change under a road.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trail]),
  );
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
