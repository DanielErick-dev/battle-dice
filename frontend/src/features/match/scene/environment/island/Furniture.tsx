"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, type Group, MeshStandardMaterial, SphereGeometry } from "three";
import { useFittedProp, type PropId } from "@/features/characters/core/props";
import type { Vec3 } from "@/features/shared/board/boardLayout";

/** How tall a lamp post stands next to the trail: a little over a figure (3). */
const POST_HEIGHT = 3.2;
/** The lamp's glass, as a share of the post's height (the Meshy post's lantern hangs at the top). */
const LAMP_AT = 0.86;
const lampGeometry = new SphereGeometry(0.15, 12, 8);
const lampMaterial = new MeshStandardMaterial({
  color: "#fff1c1",
  emissive: new Color("#fbbf24").multiplyScalar(2.2),
  toneMapped: false,
});

/** A vintage lamp post (Meshy) with a glowing lamp: no light of its own, only glow through the bloom. */
export function Lantern({ position }: { position: Vec3 }) {
  const post = useFittedProp("lanternPost");
  return (
    <group position={position}>
      <mesh geometry={post.geometry} material={post.material} scale={POST_HEIGHT} castShadow />
      <mesh geometry={lampGeometry} material={lampMaterial} position-y={POST_HEIGHT * LAMP_AT} />
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
  "boat-row-small": { prop: "bambooBoat", height: 0.7 },
  campfire_logs: { prop: "campfire", height: 1.4 },
};

/** A swapped kit piece (see MESHY_SWAPS); a campfire also crackles with sparks, a boat rocks on the swell. */
export function SwappedPiece({ item }: { item: { piece: string; x: number; y: number; z: number; turn: number } }) {
  const swap = MESHY_SWAPS[item.piece];
  const rocking = useRef<Group>(null);
  const floats = item.piece === "boat-row-small";
  useFrame(({ clock }) => {
    if (!floats || !rocking.current) return;
    const time = clock.elapsedTime + item.x;
    rocking.current.position.y = Math.sin(time * 1.1) * 0.05;
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
