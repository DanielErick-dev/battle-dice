"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { useAge } from "./useAge";

const BURST_SECONDS = 1.3;
const COLUMN_HEIGHT = 2.6;

/**
 * A character's ability going off: a shockwave rolls out over the ground and a column of
 * light rises through the figure, in the character's colour. Mounted with a fresh key per use,
 * inside the token's effect scale.
 */
export function AbilityBurst({ color }: { color: string }) {
  const root = useRef<Group>(null);
  const wave = useRef<Mesh>(null);
  const waveMaterial = useRef<MeshBasicMaterial>(null);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const age = useAge();
  // Past 1.0 so it glows through the bloom pass.
  const glow = useMemo(() => new Color(color).multiplyScalar(2.4), [color]);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) / BURST_SECONDS;
    if (root.current) root.current.visible = t < 1;
    if (t >= 1) return;

    const spread = 1 - (1 - t) ** 3;
    wave.current?.scale.setScalar(0.3 + spread * 2.4);
    if (waveMaterial.current) waveMaterial.current.opacity = 0.9 * (1 - t);

    const rise = Math.min(1, t * 4);
    column.current?.scale.set(1 - t * 0.6, rise, 1 - t * 0.6);
    if (columnMaterial.current) columnMaterial.current.opacity = 0.55 * (1 - t) ** 1.5;
  });

  return (
    <group ref={root}>
      <mesh ref={wave} rotation-x={-Math.PI / 2} position-y={0.05}>
        <ringGeometry args={[0.55, 0.7, 48]} />
        <meshBasicMaterial
          ref={waveMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={column} position-y={COLUMN_HEIGHT / 2}>
        <cylinderGeometry args={[0.55, 0.75, COLUMN_HEIGHT, 32, 1, true]} />
        <meshBasicMaterial
          ref={columnMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <Sparkles
        count={36}
        scale={[1.6, COLUMN_HEIGHT, 1.6]}
        position-y={COLUMN_HEIGHT / 2}
        size={6}
        speed={3}
        color={color}
      />
    </group>
  );
}
