"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  type BufferGeometry,
  Color,
  type Group,
  type InstancedMesh,
  type Material,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from "three";
import { chunked } from "../shared/chunks";
import { useFittedProp, type PropId } from "@/features/characters/core/props";
import type { Vec3 } from "@/features/shared/board/boardLayout";

/** How tall a lamp post stands next to the trail: a little over a figure (3). */
const POST_HEIGHT = 3.2;
/** Where the Meshy post's lantern hangs off its arm, as shares of the post's height (measured on the model). */
const LAMP_AT = { x: -0.09, y: 0.72 };
const lampGeometry = new SphereGeometry(0.1, 12, 8);
const lampMaterial = new MeshStandardMaterial({
  color: "#fff1c1",
  emissive: new Color("#fbbf24").multiplyScalar(2.2),
  toneMapped: false,
});

/**
 * The vintage lamp posts (Meshy) along the road, each with a glowing lamp on its arm turned out by its `turn`:
 * all the posts in one draw and all the lamps in another; their light on the ground is a lamp pool (lampGlow).
 */
export function Lanterns({ spots }: { spots: readonly { at: Vec3; turn: number }[] }) {
  const post = useFittedProp("lanternPost");
  const posts = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!posts.current || !lamps.current) return;
    const place = new Object3D();
    spots.forEach(({ at: [x, y, z], turn }, index) => {
      place.position.set(x, y, z);
      place.rotation.set(0, turn, 0);
      place.scale.setScalar(POST_HEIGHT);
      place.updateMatrix();
      posts.current!.setMatrixAt(index, place.matrix);
      place.scale.setScalar(1);
      place.translateX(POST_HEIGHT * LAMP_AT.x);
      place.position.y += POST_HEIGHT * LAMP_AT.y;
      place.updateMatrix();
      lamps.current!.setMatrixAt(index, place.matrix);
    });
    for (const mesh of [posts.current, lamps.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [spots]);
  if (spots.length === 0) return null;
  return (
    <group>
      <instancedMesh
        key={`p${spots.length}`}
        ref={posts}
        args={[post.geometry, post.material, spots.length]}
        castShadow
      />
      <instancedMesh key={`l${spots.length}`} ref={lamps} args={[lampGeometry, lampMaterial, spots.length]} />
    </group>
  );
}

const BENCH_LENGTH = 1.37;

/** A wooden bench (Meshy) by the trail. */
export function Bench({ position, turn }: { position: Vec3; turn: number }) {
  const bench = useFittedProp("islandBench");
  return (
    <mesh
      geometry={bench.geometry}
      material={bench.material}
      position={position}
      rotation-y={turn}
      scale={BENCH_LENGTH / bench.size[0]}
      castShadow
    />
  );
}

/** Kit pieces drawn as a Meshy model instead: which prop, and how tall. */
export const MESHY_SWAPS: Readonly<Record<string, { prop: PropId; height: number }>> = {
  building_windmill_blue: { prop: "islandWindmill", height: 3.2 },
  // As tall as half a figure: smaller, they were lost on the water.
  "boat-row-small": { prop: "bambooBoat", height: 1.6 },
  campfire_logs: { prop: "campfire", height: 1.4 },
};

/** Countryside kit pieces drawn as a Meshy model, many copies at once: how tall per unit of the piece's scale. */
export const SCATTER_SWAPS: Readonly<Record<string, { prop: PropId; heightPerScale: number }>> = {
  plant_bush: { prop: "islandShrub", heightPerScale: 0.3 },
  plant_bushDetailed: { prop: "islandShrub", heightPerScale: 0.3 },
  plant_bushLarge: { prop: "islandShrub", heightPerScale: 0.36 },
  rock_largeA: { prop: "islandRock", heightPerScale: 0.28 },
  rock_largeC: { prop: "islandRock", heightPerScale: 0.28 },
  rock_largeE: { prop: "islandRock", heightPerScale: 0.28 },
  rock_tallC: { prop: "islandRock", heightPerScale: 0.34 },
  // Variety among the bushes (see coast.ts BUSH_VARIETY).
  rock_small: { prop: "islandRock", heightPerScale: 0.14 },
  tree_young: { prop: "islandPine", heightPerScale: 0.55 },
  flower_shadow: { prop: "shadowFlower", heightPerScale: 0.42 },
  flower_nebula: { prop: "nebulaBloom", heightPerScale: 0.42 },
  glowcaps: { prop: "islandGlowcaps", heightPerScale: 0.3 },
  rocks_mossy: { prop: "islandMossyRocks", heightPerScale: 0.26 },
  // The woods: a mossy log lying long (its height is a fraction of its length) and dead trees taller than a figure.
  log: { prop: "islandDriftwood", heightPerScale: 0.13 },
  tree_dead: { prop: "islandDeadTree", heightPerScale: 0.75 },
  // Our own houses on the kit town's spots, as tall as the kit's (see townPieces.ts) so they fill the same footprint.
  building_home_A_blue: { prop: "islandCottage", heightPerScale: 0.93 },
  building_home_A_red: { prop: "islandCottage", heightPerScale: 0.93 },
  building_home_B_blue: { prop: "islandWindHouse", heightPerScale: 1.28 },
  building_home_B_red: { prop: "islandWindHouse", heightPerScale: 1.28 },
  building_tavern_blue: { prop: "islandCottage", heightPerScale: 1.3 },
  building_tavern_red: { prop: "islandWindHouse", heightPerScale: 1.4 },
};

/** How far round its middle each scattered prop spreads, per unit of its height (a rock: 1.8 wide per 1 tall). */
export const SCATTER_REACH: Partial<Record<PropId, number>> = {
  islandRock: 0.9,
  islandShrub: 0.55,
  islandPine: 0.35,
  shadowFlower: 0.45,
  nebulaBloom: 0.35,
  islandGlowcaps: 0.45,
  islandMossyRocks: 0.95,
  islandDriftwood: 1.8,
  islandDeadTree: 0.55,
  islandCottage: 0.5,
  islandWindHouse: 0.45,
};

/** Props whose petals glow faintly at night, lit by their own colours. */
const GLOWING: ReadonlySet<PropId> = new Set(["shadowFlower", "nebulaBloom", "islandGlowcaps"]);

type ScatterItem = { piece: string; x: number; y: number; z: number; turn: number; scale: number };

/** Every copy of one Meshy prop among the countryside pieces (see SCATTER_SWAPS), in a single draw. */
export function ScatterProps({ prop, items }: { prop: PropId; items: readonly ScatterItem[] }) {
  const model = useFittedProp(prop);
  const material = useMemo(() => {
    if (!GLOWING.has(prop)) return model.material;
    const glow = model.material.clone();
    glow.emissiveMap = glow.map;
    glow.emissive = new Color("#ffffff");
    glow.emissiveIntensity = 0.55;
    return glow;
  }, [prop, model.material]);
  useEffect(() => () => void (material !== model.material && material.dispose()), [material, model.material]);
  const groups = useMemo(() => chunked(items), [items]);
  return (
    <>
      {groups.map((group, index) => (
        <ScatterChunk key={index} geometry={model.geometry} material={material} items={group} />
      ))}
    </>
  );
}

/** One square of the map's copies of a scattered prop (see chunked), culled on its own. */
function ScatterChunk({
  geometry,
  material,
  items,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: readonly ScatterItem[];
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    const transform = new Object3D();
    items.forEach((item, index) => {
      const height = item.scale * (SCATTER_SWAPS[item.piece]?.heightPerScale ?? 0.3);
      // Sunk a little so a bumpy base never shows a gap over the slope.
      transform.position.set(item.x, item.y - height * 0.06, item.z);
      transform.rotation.set(0, item.turn, 0);
      transform.scale.setScalar(height);
      transform.updateMatrix();
      current.setMatrixAt(index, transform.matrix);
    });
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh key={items.length} ref={mesh} args={[geometry, material, items.length]} castShadow receiveShadow />
  );
}

/** A swapped kit piece (see MESHY_SWAPS); a campfire also crackles with sparks, a boat rocks on the swell. */
export function SwappedPiece({ item }: { item: { piece: string; x: number; y: number; z: number; turn: number } }) {
  const swap = MESHY_SWAPS[item.piece];
  const rocking = useRef<Group>(null);
  const floats = item.piece === "boat-row-small";
  useFrame(({ clock }) => {
    if (!floats || !rocking.current) return;
    const time = clock.elapsedTime + item.x;
    rocking.current.position.y = Math.sin(time * 1.1) * 0.08;
    rocking.current.rotation.z = Math.sin(time * 0.8) * 0.06;
    rocking.current.rotation.x = Math.sin(time * 0.6 + 1) * 0.04;
  });
  if (!swap) return null;
  return (
    <group position={[item.x, item.y, item.z]} rotation-y={item.turn}>
      <group ref={rocking}>
        <FittedMesh prop={swap.prop} height={swap.height} />
      </group>
      {item.piece === "campfire_logs" && (
        <Sparkles count={18} scale={[1.2, 2.2, 1.2]} position-y={1.4} size={5} speed={1.6} color="#ffb347" />
      )}
    </group>
  );
}

function FittedMesh({ prop, height }: { prop: PropId; height: number }) {
  const model = useFittedProp(prop);
  return <mesh geometry={model.geometry} material={model.material} scale={height} castShadow receiveShadow />;
}

/** The hanging wooden sign (Meshy) by the trail's first tile. */
export function TrailSign({ position }: { position: Vec3 }) {
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <FittedMesh prop="hangingSign" height={1.4} />
    </group>
  );
}
