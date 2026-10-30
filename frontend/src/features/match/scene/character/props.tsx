"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";

/** Static models built from Meshy exports by scripts/props/build-props.mjs. */
export const PROPS = {
  skull: "/models/props/boneShaman/skull.glb",
  skeletalHand: "/models/props/boneShaman/hand.glb",
  skeleton: "/models/props/boneShaman/skeleton.glb",
  elvenArrow: "/models/props/elvenArcher/arrow.glb",
  elvenBow: "/models/props/elvenArcher/bow.glb",
  archerTarget: "/models/props/elvenArcher/target.glb",
  islandPine: "/models/props/island/pine.glb",
  islandRockyTree: "/models/props/island/rockyTree.glb",
  frostWand: "/models/props/crystalFairy/wand.glb",
  justiceScale: "/models/props/tideMaiden/scale.glb",
  voidWraith: "/models/props/voidKnight/wraith.glb",
  fairyWings: "/models/props/crystalFairy/wings.glb",
  seraphWings: "/models/props/seraphGuardian/wings.glb",
  fallenWings: "/models/props/fallenSeraph/wings.glb",
  blackFlame: "/models/props/purgatoryKunoichi/flame.glb",
  frostThrone: "/models/props/crystalFairy/chair.glb",
  infernalThrone: "/models/props/crimsonStudent/chair.glb",
  wolfThrone: "/models/props/frostfangBerserker/chair.glb",
  celestialThrone: "/models/props/seraphGuardian/chair.glb",
  ashenThrone: "/models/props/fallenSeraph/chair.glb",
  clockworkThrone: "/models/props/clockworkSentinel/chair.glb",
  cyberThrone: "/models/props/sentinelMech/chair.glb",
  obsidianThrone: "/models/props/purgatoryKunoichi/chair.glb",
  elderwoodThrone: "/models/props/elvenArcher/chair.glb",
  tideThrone: "/models/props/goldenGuardian/chair.glb",
  stormThrone: "/models/props/wanderingSage/chair.glb",
  crimsonThrone: "/models/props/crimsonWitch/chair.glb",
  jesterThrone: "/models/props/cardJester/chair.glb",
  scribeThrone: "/models/props/fleshScribe/chair.glb",
  alchemistThrone: "/models/props/emeraldAlchemist/chair.glb",
  necromancerThrone: "/models/props/boneShaman/chair.glb",
  elementalThrone: "/models/props/windGuardian/chair.glb",
  amethystThrone: "/models/props/voidKnight/chair.glb",
  moonThrone: "/models/props/tideMaiden/chair.glb",
  shadowThrone: "/models/props/shadowWarden/chair.glb",
  roseThrone: "/models/props/crimsonEnchantress/chair.glb",
  seraphCrown: "/models/props/seraphGuardian/crown.glb",
  fallenCrown: "/models/props/fallenSeraph/crown.glb",
  kageTorii: "/models/props/purgatoryKunoichi/torii.glb",
  witchCauldron: "/models/props/crimsonWitch/cauldron.glb",
  kageTree: "/models/props/purgatoryKunoichi/tree.glb",
  auricPillars: "/models/props/goldenGuardian/pillars.glb",
  auricChest: "/models/props/goldenGuardian/chest.glb",
  auricCoral: "/models/props/goldenGuardian/coral.glb",
  cronosGlobe: "/models/props/clockworkSentinel/globe.glb",
  bjornCrystal: "/models/props/frostfangBerserker/crystal.glb",
  roseCandelabra: "/models/props/crimsonEnchantress/candelabra.glb",
  susanoo: "/models/props/purgatoryKunoichi/susanoo.glb",
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
