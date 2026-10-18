"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Mesh } from "three";
import { useRuneTexture } from "@/features/match/scene/character/runeCircle";
import { FLOOR_Y } from "./layout";

const PEDESTAL_RADIUS = 0.62;
const PEDESTAL_DEPTH = 0.12;

/** A dark stone disc under the figure with a slowly turning ring of glowing runes on top. */
export function RunePedestal({ color }: { color: string }) {
  const runes = useRuneTexture();
  const ring = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.15;
  });

  return (
    <group position-y={FLOOR_Y}>
      {/* Drawn first without depth, so a blade or foot dipping below the top still shows. */}
      <mesh position-y={-PEDESTAL_DEPTH / 2} renderOrder={-1}>
        <cylinderGeometry args={[PEDESTAL_RADIUS, PEDESTAL_RADIUS * 1.08, PEDESTAL_DEPTH, 48]} />
        <meshStandardMaterial color="#17131f" metalness={0.7} roughness={0.45} depthWrite={false} />
      </mesh>
      <mesh position-y={-PEDESTAL_DEPTH * 0.35} rotation-x={Math.PI / 2}>
        <torusGeometry args={[PEDESTAL_RADIUS * 1.02, 0.008, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position-y={0.001} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[PEDESTAL_RADIUS * 0.98, 64]} />
        <meshBasicMaterial
          map={runes}
          color={color}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
