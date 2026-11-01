"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BufferAttribute, MeshStandardMaterial, PlaneGeometry } from "three";

const FRONDS = [
  { x: -0.84, z: -0.14, height: 0.42, phase: 0 },
  { x: -0.48, z: -0.74, height: 0.55, phase: 1.3 },
  { x: -0.4, z: -0.68, height: 0.36, phase: 2.1 },
  { x: 0.1, z: -0.92, height: 0.6, phase: 0.6 },
  { x: 0.42, z: -0.82, height: 0.46, phase: 2.8 },
  { x: 0.74, z: -0.38, height: 0.34, phase: 1.9 },
  { x: -0.7, z: 0.4, height: 0.18, phase: 3.4 },
  { x: 0.7, z: 0.36, height: 0.2, phase: 4.2 },
];

const FROND_SEGMENTS = 8;

/** Ribbons of weed bending in the current, each vertex swung further the higher it is. */
export function Seaweed({ weed, darkWeed }: { weed: MeshStandardMaterial; darkWeed: MeshStandardMaterial }) {
  const fronds = useMemo(
    () =>
      FRONDS.map(({ height }) => {
        const geometry = new PlaneGeometry(0.05, height, 1, FROND_SEGMENTS);
        geometry.translate(0, height / 2, 0);
        const positions = geometry.getAttribute("position") as BufferAttribute;
        // Tapered to a point at the top.
        for (let index = 0; index < positions.count; index++) {
          positions.setX(index, positions.getX(index) * (1 - (positions.getY(index) / height) * 0.75));
        }
        return { geometry, rest: Float32Array.from(positions.array) };
      }),
    [],
  );
  useEffect(() => () => fronds.forEach(({ geometry }) => geometry.dispose()), [fronds]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fronds.forEach(({ geometry, rest }, frond) => {
      const { height, phase } = FRONDS[frond];
      const positions = geometry.getAttribute("position") as BufferAttribute;
      for (let index = 0; index < positions.count; index++) {
        const y = rest[index * 3 + 1];
        const reach = (y / height) ** 1.5;
        positions.setX(index, rest[index * 3] + Math.sin(t * 1.1 + phase + y * 6) * 0.06 * reach);
        positions.setZ(index, Math.cos(t * 0.8 + phase + y * 4) * 0.04 * reach);
      }
      positions.needsUpdate = true;
    });
  });

  return (
    <>
      {FRONDS.map(({ x, z, phase }, index) => (
        <mesh
          key={`${x}:${z}`}
          geometry={fronds[index].geometry}
          material={index % 2 ? darkWeed : weed}
          position={[x, 0, z]}
          rotation-y={phase}
        />
      ))}
    </>
  );
}
