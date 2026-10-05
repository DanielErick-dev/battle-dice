"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";

/** Static models built from Meshy exports by scripts/props/build-props.mjs. */
export const PROPS = {
  skull: "/models/props/skull.glb",
  skeletalHand: "/models/props/skeletalHand.glb",
  skeleton: "/models/props/skeleton.glb",
} as const;
export type PropId = keyof typeof PROPS;

/** Meshy exports every prop at this height, centred on the origin and facing +Z. */
const PROP_HEIGHT = 1.9;

export function preloadProps(ids: PropId[]): void {
  for (const id of ids) useGLTF.preload(PROPS[id]);
}

/** The single mesh of a prop: its geometry and material, shared by every copy. */
export function usePropMesh(id: PropId): { geometry: BufferGeometry; material: MeshStandardMaterial } {
  const { scene } = useGLTF(PROPS[id]);
  return useMemo(() => firstMesh(scene, id), [scene, id]);
}

function firstMesh(scene: Object3D, id: PropId): { geometry: BufferGeometry; material: MeshStandardMaterial } {
  let found: Mesh | undefined;
  scene.traverse((node) => {
    if (!found && (node as Mesh).isMesh) found = node as Mesh;
  });
  if (!found) throw new Error(`No mesh in prop ${id}`);
  return { geometry: found.geometry, material: found.material as MeshStandardMaterial };
}

/** A copy of a prop's material that can fade out, its colour darkened by `shade` (1 keeps it). */
export function fadingMaterial(material: MeshStandardMaterial, shade = 1): MeshStandardMaterial {
  const copy = material.clone();
  copy.transparent = true;
  copy.color.multiplyScalar(shade);
  return copy;
}

/** A prop `height` tall, centred on its origin, or `standing` on it. */
export function Prop({
  geometry,
  material,
  height,
  standing = false,
}: {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  height: number;
  standing?: boolean;
}) {
  return (
    <mesh geometry={geometry} material={material} scale={height / PROP_HEIGHT} position-y={standing ? height / 2 : 0} />
  );
}

/** Where a prop's point sits, given in its export's units (see PROP_HEIGHT), for a copy `height` tall. */
export function propPoint(height: number, [x, y, z]: [number, number, number]): [number, number, number] {
  const unit = height / PROP_HEIGHT;
  return [x * unit, y * unit, z * unit];
}
