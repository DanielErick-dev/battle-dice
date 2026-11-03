"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshBasicMaterial, type Sprite } from "three";
import { FlameCard, useSoftDisc } from "../kit/matchAssets";

/** Over 1.0: the charred rim glows into bloom. */
const EMBER_EDGE = new Color("#ff6a1f").multiplyScalar(2.4);

/** The corner of a fallen page catching fire: a glowing, charred rim, two little flames and a few sparks. */
export function SmoulderingCorner({ width, seed = 0 }: { width: number; seed?: number }) {
  const disc = useSoftDisc();
  const edge = useMemo(() => new MeshBasicMaterial({ color: EMBER_EDGE, toneMapped: false }), []);
  const glow = useRef<Sprite>(null);
  useEffect(() => () => edge.dispose(), [edge]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    edge.color.copy(EMBER_EDGE).multiplyScalar(0.75 + 0.25 * Math.sin(t * 3.7) + 0.1 * Math.sin(t * 11));
    if (glow.current) glow.current.material.opacity = 0.32 + 0.08 * Math.sin(t * 6.1);
  });

  return (
    <group>
      <mesh material={edge} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position-y={0.006}>
        <planeGeometry args={[width, 0.006]} />
      </mesh>
      <FlameCard width={0.03} position={[-width * 0.15, 0.004, 0]} seed={seed} />
      <FlameCard width={0.022} position={[width * 0.2, 0.004, 0.01]} seed={seed + 4} />
      <sprite ref={glow} position-y={0.03} scale={0.16}>
        <spriteMaterial map={disc} color="#ff6a1a" transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <Sparkles count={6} scale={[0.08, 0.3, 0.08]} position-y={0.15} size={1.6} speed={0.8} color="#ffb067" />
    </group>
  );
}
