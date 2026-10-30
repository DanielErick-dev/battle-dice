"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";

/** Static models built from Meshy exports by scripts/props/build-props.mjs. */
export const PROPS = {
  skull: "/models/props/skull.glb",
  skeletalHand: "/models/props/skeletalHand.glb",
  skeleton: "/models/props/skeleton.glb",
  elvenArrow: "/models/props/elvenArrow.glb",
  elvenBow: "/models/props/elvenBow.glb",
  archerTarget: "/models/props/archerTarget.glb",
  islandPine: "/models/props/islandPine.glb",
  islandRockyTree: "/models/props/islandRockyTree.glb",
  frostWand: "/models/props/frostWand.glb",
  justiceScale: "/models/props/justiceScale.glb",
  voidWraith: "/models/props/voidWraith.glb",
  fairyWings: "/models/props/fairyWings.glb",
  seraphWings: "/models/props/seraphWings.glb",
  fallenWings: "/models/props/fallenWings.glb",
  blackFlame: "/models/props/blackFlame.glb",
  frostThrone: "/models/props/frostThrone.glb",
  infernalThrone: "/models/props/infernalThrone.glb",
  wolfThrone: "/models/props/wolfThrone.glb",
  celestialThrone: "/models/props/celestialThrone.glb",
  ashenThrone: "/models/props/ashenThrone.glb",
  clockworkThrone: "/models/props/clockworkThrone.glb",
  cyberThrone: "/models/props/cyberThrone.glb",
  obsidianThrone: "/models/props/obsidianThrone.glb",
  elderwoodThrone: "/models/props/elderwoodThrone.glb",
  tideThrone: "/models/props/tideThrone.glb",
  stormThrone: "/models/props/stormThrone.glb",
  crimsonThrone: "/models/props/crimsonThrone.glb",
  jesterThrone: "/models/props/jesterThrone.glb",
  scribeThrone: "/models/props/scribeThrone.glb",
  alchemistThrone: "/models/props/alchemistThrone.glb",
  necromancerThrone: "/models/props/necromancerThrone.glb",
  elementalThrone: "/models/props/elementalThrone.glb",
  amethystThrone: "/models/props/amethystThrone.glb",
  moonThrone: "/models/props/moonThrone.glb",
  shadowThrone: "/models/props/shadowThrone.glb",
  roseThrone: "/models/props/roseThrone.glb",
  seraphCrown: "/models/props/seraphCrown.glb",
  fallenCrown: "/models/props/fallenCrown.glb",
  kageTorii: "/models/props/kageTorii.glb",
  witchCauldron: "/models/props/witchCauldron.glb",
  kageTree: "/models/props/kageTree.glb",
  auricPillars: "/models/props/auricPillars.glb",
  auricChest: "/models/props/auricChest.glb",
  auricCoral: "/models/props/auricCoral.glb",
  cronosGlobe: "/models/props/cronosGlobe.glb",
  bjornCrystal: "/models/props/bjornCrystal.glb",
  roseCandelabra: "/models/props/roseCandelabra.glb",
  susanoo: "/models/props/susanoo.glb",
} as const;
export type PropId = keyof typeof PROPS;

/** Meshy exports every prop at this height, centred on the origin and facing +Z. */
export const PROP_HEIGHT = 1.9;

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
