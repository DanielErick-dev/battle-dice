"use client";

import { useMemo } from "react";
import { BackSide, PlaneGeometry } from "three";
import { useDisposable } from "@/features/characters/shared/disposal";
import { useCanvasTexture, type Painter } from "@/features/shared/three/canvasTexture";
import { TRAIL_GROUND } from "./trailPlan";

/** A dark dome round the map that ignores the fog: everything beyond the walls is this colour. */
export function Vault({ x, z, radius, color }: { x: number; z: number; radius: number; color: string }) {
  return (
    <mesh position={[x, 0, z]}>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshBasicMaterial color={color} side={BackSide} fog={false} />
    </mesh>
  );
}

interface TiledFloorProps {
  x: number;
  z: number;
  width: number;
  depth: number;
  /** World units per repeat of the painted texture. */
  repeat: number;
  paint: Painter;
  seed: number;
  color: string;
  roughness: number;
}

/** A flat floor at the trail's level, its painted texture tiled every `repeat` units. */
export function TiledFloor({ x, z, width, depth, repeat, paint, seed, color, roughness }: TiledFloorProps) {
  const texture = useCanvasTexture({ size: 512, draw: paint, seed, tile: true });
  // The plane's UVs run past 1 so the texture repeats.
  const geometry = useDisposable(
    useMemo(() => {
      const plane = new PlaneGeometry(width, depth);
      const uv = plane.getAttribute("uv");
      for (let index = 0; index < uv.count; index++) {
        uv.setXY(index, (uv.getX(index) * width) / repeat, (uv.getY(index) * depth) / repeat);
      }
      return plane;
    }, [width, depth, repeat]),
  );
  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position={[x, TRAIL_GROUND, z]} receiveShadow>
      <meshStandardMaterial map={texture} roughness={roughness} color={color} />
    </mesh>
  );
}
