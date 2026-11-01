"use client";

import { MeshStandardMaterial } from "three";
import { NOTEBOOK_SIZE } from "./layout";

/** A closed notebook lying flat, `level` notebooks up its pile. */
export function Notebook({
  cover,
  paper,
  level,
}: {
  cover: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  level: number;
}) {
  const thickness = 0.016;
  return (
    <group position-y={level * thickness + thickness / 2} rotation-y={level * 0.25}>
      <mesh material={cover}>
        <boxGeometry args={[NOTEBOOK_SIZE[0], thickness, NOTEBOOK_SIZE[1]]} />
      </mesh>
      <mesh material={paper} position-x={0.003}>
        <boxGeometry args={[NOTEBOOK_SIZE[0] - 0.004, thickness * 0.7, NOTEBOOK_SIZE[1] + 0.002]} />
      </mesh>
    </group>
  );
}
