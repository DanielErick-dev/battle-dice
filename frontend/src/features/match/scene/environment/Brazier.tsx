"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type Group, type PointLight } from "three";

const PILLAR_HEIGHT = 1.3;
const FLAME_COLOR = "#ff7a1a";
/** Flame colours pushed past 1.0 so the bloom pass makes them glow. */
const FLAME_OUTER = new Color(FLAME_COLOR).multiplyScalar(1.6);
const FLAME_INNER = new Color("#ffe08a").multiplyScalar(1.3);

/** Stone pillar with a bowl of flickering fire, lighting the arena corner. */
export function Brazier({ position, seed }: { position: [number, number, number]; seed: number }) {
  const flame = useRef<Group>(null);
  const light = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 10;
    const flicker = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 23) * 0.04;
    if (flame.current) {
      flame.current.scale.set(1, flicker, 1);
      flame.current.rotation.y = t * 0.8;
    }
    if (light.current) light.current.intensity = 9 * flicker;
  });

  return (
    <group position={position}>
      <mesh position-y={PILLAR_HEIGHT / 2} castShadow>
        <cylinderGeometry args={[0.22, 0.32, PILLAR_HEIGHT, 8]} />
        <meshStandardMaterial color="#4b4a5c" roughness={0.9} flatShading />
      </mesh>
      <mesh position-y={PILLAR_HEIGHT + 0.08}>
        <cylinderGeometry args={[0.42, 0.26, 0.2, 12, 1, true]} />
        <meshStandardMaterial color="#2a2530" metalness={0.6} roughness={0.4} side={DoubleSide} />
      </mesh>

      <group ref={flame} position-y={PILLAR_HEIGHT + 0.12}>
        <mesh position-y={0.32}>
          <coneGeometry args={[0.3, 0.75, 10, 1, true]} />
          <meshBasicMaterial
            color={FLAME_OUTER}
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position-y={0.22}>
          <coneGeometry args={[0.16, 0.45, 8, 1, true]} />
          <meshBasicMaterial
            color={FLAME_INNER}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      <Sparkles count={14} scale={[0.6, 1.6, 0.6]} position-y={PILLAR_HEIGHT + 1} size={2.5} speed={1.4} color="#ffb347" />
      <pointLight ref={light} color={FLAME_COLOR} distance={9} decay={1.6} position-y={PILLAR_HEIGHT + 0.7} />
    </group>
  );
}
