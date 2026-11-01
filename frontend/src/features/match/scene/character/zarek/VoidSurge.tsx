"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { VOID_DARK, VOID_GLOW, VOID_BLACK } from "./voidPalette";

/** Seconds the Void takes to come and work a rift open (the playback's voidRiftMs, roughly). */
export const SURGE_SECONDS = 1.8;

/** The Void at work on a tile: a black maw opens, wreathed in black smoke, a column of void rising, then it closes. */
export function VoidSurge({ position, inward }: { position: Vec3; inward: boolean }) {
  const age = useAge();
  const maw = useRef<Group>(null);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const top = position[1] + TILE_HEIGHT / 2 + 0.03;
  useFrame(({ clock }, delta) => {
    const t = Math.min(1, age(clock.elapsedTime) / SURGE_SECONDS);
    // Opens fast, holds, closes.
    const open = t < 0.25 ? t / 0.25 : t > 0.8 ? (1 - t) / 0.2 : 1;
    if (maw.current) {
      maw.current.scale.setScalar(Math.max(0.001, open));
      maw.current.rotation.y += delta * (inward ? 2.5 : -2.5);
    }
    if (column.current) column.current.scale.set(open, 0.2 + open * 1.2, open);
    if (columnMaterial.current) columnMaterial.current.opacity = open * 0.45;
    if (glow.current) glow.current.opacity = open * 0.5;
  });
  return (
    <group position={[position[0], top, position[2]]}>
      <group ref={maw}>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[TILE_SIZE * 0.62, 40]} />
          <meshBasicMaterial color={VOID_DARK} transparent opacity={0.92} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
          <ringGeometry args={[TILE_SIZE * 0.58, TILE_SIZE * 0.78, 6, 1]} />
          <meshBasicMaterial color={VOID_BLACK} transparent depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={column} position-y={1.1}>
        <cylinderGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.55, 2.2, 24, 1, true]} />
        <meshBasicMaterial
          ref={columnMaterial}
          color={VOID_BLACK}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Sparkles
        count={40}
        scale={[TILE_SIZE * 1.4, 2.4, TILE_SIZE * 1.4]}
        position-y={1}
        size={5}
        speed={inward ? 1.6 : 0.8}
        color={VOID_GLOW}
      />
      {/* A glow on the ground instead of a light: adding lights recompiles every material and stalls the game. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[TILE_SIZE * 1.6, 40]} />
        <meshBasicMaterial
          ref={glow}
          color={VOID_BLACK}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
