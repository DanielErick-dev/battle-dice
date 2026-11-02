"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type MeshBasicMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { VOID_GLOW, VOID_BLACK } from "./voidPalette";

/** A rift's lip: a black crack breathing round the tile, motes rising out of it. */
export function RiftMaw({ position }: { position: Vec3 }) {
  const rim = useRef<MeshBasicMaterial>(null);
  const top = position[1] + TILE_HEIGHT / 2 + 0.02;
  useFrame(({ clock }) => {
    if (rim.current) rim.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 2.4 + position[0]) * 0.25;
  });
  return (
    <group position={[position[0], top, position[2]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[TILE_SIZE * 0.5, TILE_SIZE * 0.68, 48]} />
        <meshBasicMaterial ref={rim} color={VOID_BLACK} transparent depthWrite={false} side={DoubleSide} />
      </mesh>
      <Sparkles
        count={14}
        scale={[TILE_SIZE, 1.4, TILE_SIZE]}
        position-y={0.6}
        size={3}
        speed={0.5}
        color={VOID_GLOW}
      />
    </group>
  );
}
