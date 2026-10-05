"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Mesh } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { NameTag } from "./NameTag";

/** A tile picked for an ability, before it's confirmed: a ring in the pick's colour and its tag above. */
export function PickedTileMark({ position, tag, color }: { position: Vec3; tag: string; color: string }) {
  const ring = useRef<Mesh>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(2), [color]);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.8;
  });

  return (
    <group position={[position[0], position[1] + TILE_HEIGHT / 2, position[2]]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.48, 6]} />
        <meshBasicMaterial color={glow} transparent opacity={0.9} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <NameTag text={tag} color={color} y={0.6} size={1.6} />
    </group>
  );
}
