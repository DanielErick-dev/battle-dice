"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type { BufferGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";
import { floatCopy } from "./floatCopy";

/** Static models built from Meshy exports by scripts/props/build-props.mjs. */
export const PROPS = {
  skull: "/models/props/necromancer/skull.glb",
  skeletalHand: "/models/props/necromancer/hand.glb",
  skeleton: "/models/props/necromancer/skeleton.glb",
  elvenArrow: "/models/props/archer/arrow.glb",
  elvenBow: "/models/props/archer/bow.glb",
  archerTarget: "/models/props/archer/target.glb",
  islandPine: "/models/props/island/pine.glb",
  islandRockyTree: "/models/props/island/rockyTree.glb",
  frostWand: "/models/props/fairy/wand.glb",
  justiceScale: "/models/props/themis/scale.glb",
  justiceSword: "/models/props/themis/sword.glb",
  greekColumn: "/models/props/themis/column.glb",
  scaleBeam: "/models/props/themis/scale-beam.glb",
  scalePan: "/models/props/themis/scale-pan.glb",
  tribunalArena: "/models/props/themis/arena.glb",
  tribunalArch: "/models/props/themis/archway.glb",
  offeringBasin: "/models/props/themis/basin.glb",
  akaneCourtyard: "/models/props/akane/courtyard.glb",
  akaneLantern: "/models/props/akane/lantern.glb",
  akaneTree: "/models/props/akane/tree.glb",
  viniciusHoe: "/models/props/vinicius/hoe.glb",
  viniciusGarden: "/models/props/vinicius/garden.glb",
  voidWraith: "/models/props/zarek/wraith.glb",
  fairyWings: "/models/props/fairy/wings.glb",
  seraphWings: "/models/props/seraphiel/wings.glb",
  fallenWings: "/models/props/seraphielFallen/wings.glb",
  blackFlame: "/models/props/kage/flame.glb",
  frostThrone: "/models/props/fairy/chair.glb",
  infernalThrone: "/models/props/akane/chair.glb",
  wolfThrone: "/models/props/bjorn/chair.glb",
  celestialThrone: "/models/props/seraphiel/chair.glb",
  ashenThrone: "/models/props/seraphielFallen/chair.glb",
  clockworkThrone: "/models/props/cronos/chair.glb",
  cyberThrone: "/models/props/alva/chair.glb",
  hangarPad: "/models/props/alva/landing-pad.glb",
  hangarCable: "/models/props/alva/power-cable.glb",
  hangarReactor: "/models/props/alva/alien-reactor.glb",
  hangarGenerator: "/models/props/alva/power-generator.glb",
  hangarCapsule: "/models/props/alva/crystal-capsule.glb",
  hangarRack: "/models/props/alva/server-rack.glb",
  hangarCore: "/models/props/alva/hypergate-core.glb",
  hangarDrone: "/models/props/alva/sentinel-drone.glb",
  obsidianThrone: "/models/props/kage/chair.glb",
  elderwoodThrone: "/models/props/archer/chair.glb",
  tideThrone: "/models/props/auric/chair.glb",
  stormThrone: "/models/props/monk/chair.glb",
  crimsonThrone: "/models/props/witch/chair.glb",
  jesterThrone: "/models/props/jester/chair.glb",
  scribeThrone: "/models/props/scribe/chair.glb",
  alchemistThrone: "/models/props/alchemist/chair.glb",
  necromancerThrone: "/models/props/necromancer/chair.glb",
  elementalThrone: "/models/props/zephyr/chair.glb",
  amethystThrone: "/models/props/zarek/chair.glb",
  moonThrone: "/models/props/themis/chair.glb",
  shadowThrone: "/models/props/warden/chair.glb",
  roseThrone: "/models/props/enchantress/chair.glb",
  seraphCrown: "/models/props/seraphiel/crown.glb",
  fallenCrown: "/models/props/seraphielFallen/crown.glb",
  kageStage: "/models/props/kage/torii-stage.glb",
  witchCauldron: "/models/props/witch/cauldron.glb",
  kageTree: "/models/props/kage/tree.glb",
  auricPillars: "/models/props/auric/pillars.glb",
  auricChest: "/models/props/auric/chest.glb",
  auricCoral: "/models/props/auric/coral.glb",
  cronosGlobe: "/models/props/cronos/globe.glb",
  bjornCrystal: "/models/props/bjorn/crystal.glb",
  roseCandelabra: "/models/props/enchantress/candelabra.glb",
  susanoo: "/models/props/kage/susanoo.glb",
  lanternPost: "/models/props/island/lantern-post.glb",
  islandBench: "/models/props/island/bench.glb",
  woodenBridge: "/models/props/island/bridge.glb",
  hourglass: "/models/props/board/hourglass.glb",
  snowPile: "/models/props/fairy/snow.glb",
  wardenSpecters: "/models/props/warden/specters.glb",
  islandWindmill: "/models/props/island/windmill.glb",
  bambooBoat: "/models/props/island/boat.glb",
  hangingSign: "/models/props/island/sign.glb",
  campfire: "/models/props/island/campfire.glb",
  cardChest: "/models/props/board/chest.glb",
  tenzaiFlame: "/models/props/zephyr/flame.glb",
  tenzaiBoulder: "/models/props/zephyr/boulder.glb",
  alchemyCounter: "/models/props/alchemist/counter.glb",
  alchemyCircle: "/models/props/alchemist/ritual-circle.glb",
  alchemySanctuary: "/models/props/alchemist/sanctuary.glb",
  alchemyCauldron: "/models/props/alchemist/cauldron.glb",
  witchStaff: "/models/props/witch/staff.glb",
  gravestone: "/models/props/necromancer/gravestone.glb",
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

/**
 * A prop's mesh stood on its base and centred, scaled so its height is 1 (whatever size Meshy exported it at);
 * `size` is its width, height and depth in those units.
 */
export function useFittedProp(id: PropId): {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  size: [number, number, number];
} {
  const { geometry, material } = usePropMesh(id);
  const fitted = useMemo(() => {
    const copy = floatCopy(geometry);
    copy.computeBoundingBox();
    const box = copy.boundingBox!;
    const height = box.max.y - box.min.y || 1;
    // Read before the transforms below: three recomputes `box` in place as they apply.
    const size: [number, number, number] = [(box.max.x - box.min.x) / height, 1, (box.max.z - box.min.z) / height];
    copy
      .translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
      .scale(1 / height, 1 / height, 1 / height);
    return { geometry: copy, size };
  }, [geometry]);
  useEffect(() => () => fitted.geometry.dispose(), [fitted]);
  return { ...fitted, material };
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
