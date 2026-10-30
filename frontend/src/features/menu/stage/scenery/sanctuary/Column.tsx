"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { DodecahedronGeometry, Group, MeshStandardMaterial } from "three";

const COLUMN_RADIUS = 0.07;

/** A marble column capped in gold, or broken off with its drum fallen beside it; it trembles in the gust. */
export function Column({
  x,
  z,
  height,
  broken,
  lean,
  foot,
  materials,
  rubble,
  wind,
}: {
  x: number;
  z: number;
  height: number;
  broken: boolean;
  lean: number;
  /** Height of its plinth's foot, down the dais' steps. */
  foot: number;
  materials: { marble: MeshStandardMaterial; gold: MeshStandardMaterial };
  rubble: DodecahedronGeometry;
  wind: RefObject<number>;
}) {
  const r = COLUMN_RADIUS;
  const column = useRef<Group>(null);
  // Rocked away from the dais.
  useFrame(({ clock }) => {
    if (!column.current) return;
    const t = clock.elapsedTime;
    const strength = wind.current;
    column.current.rotation.z = lean + Math.sin(t * 31 + x * 9) * strength * 0.035 - Math.sign(x) * strength * 0.03;
    column.current.rotation.x = Math.sin(t * 27 + z * 7) * strength * 0.025 - strength * 0.02;
  });
  return (
    <group ref={column} position={[x, foot, z]} rotation-z={lean}>
      <mesh material={materials.marble} position-y={0.04}>
        <boxGeometry args={[r * 3, 0.08, r * 3]} />
      </mesh>
      <mesh material={materials.gold} position-y={0.09}>
        <cylinderGeometry args={[r * 1.25, r * 1.3, 0.025, 20]} />
      </mesh>
      {/* Faceted for the flutes. */}
      <mesh material={materials.marble} position-y={0.1 + height / 2}>
        <cylinderGeometry args={[r * 0.92, r, height, 14]} />
      </mesh>
      {broken ? (
        <>
          <mesh geometry={rubble} material={materials.marble} position-y={0.1 + height} scale={[r, r * 0.6, r]} />
          {/* The fallen drum, toward the dais. */}
          <mesh
            material={materials.marble}
            position={[-Math.sign(x) * r * 2.6, r, r * 1.5]}
            rotation={[0.3, 0.6, Math.PI / 2]}
          >
            <cylinderGeometry args={[r * 0.92, r * 0.92, r * 3, 14]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={materials.gold} position-y={0.1 + height + 0.015}>
            <cylinderGeometry args={[r * 1.35, r * 0.95, 0.03, 20]} />
          </mesh>
          <mesh material={materials.marble} position-y={0.1 + height + 0.06}>
            <boxGeometry args={[r * 3, 0.06, r * 3]} />
          </mesh>
        </>
      )}
    </group>
  );
}
