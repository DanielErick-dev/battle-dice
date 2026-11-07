"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, type Sprite } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "@/features/match/scene/boardLayout";
import { SQUARE_SLAB, type SlabOutline } from "@/features/match/scene/slab";
import { useAge } from "@/features/match/scene/useAge";
import { useEmberTexture } from "../kage/blackFire";
import { COVER_HEIGHT, COVER_Y, useCoverGeometry } from "../shared/tileCover";
import { useSoftDisc } from "../shared/softDisc";
import { FlameCard } from "./FlameCard";

/** The fires on a tile, as shares of it: one in the middle, a lower ring licking round it. */
const FIRES = [
  { x: 0, z: 0, width: 0.32 },
  { x: -0.26, z: -0.22, width: 0.22 },
  { x: 0.27, z: -0.18, width: 0.2 },
  { x: -0.2, z: 0.27, width: 0.21 },
  { x: 0.24, z: 0.25, width: 0.23 },
];

/**
 * A tile under Akane's scarlet fire: glowing embers over the slab and live flames burning on it, lower and brighter
 * than Kage Rubra's black fire. Flares up from nothing as it's lit.
 */
export function ScarletFlameMark({
  position,
  outline = SQUARE_SLAB,
  delay = 0,
}: {
  position: Vec3;
  outline?: SlabOutline;
  /** Seconds before it flares up: a lit line catches tile after tile, racing ahead. */
  delay?: number;
}) {
  const cover = useCoverGeometry(outline);
  const embers = useEmberTexture();
  const disc = useSoftDisc();
  const root = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const age = useAge();
  const seed = position[0] * 1.7 + position[2] * 2.3;

  useFrame(({ clock }) => {
    const t = Math.max(0, age(clock.elapsedTime) - delay);
    root.current?.scale.set(1, Math.min(1, 0.001 + t * 2), 1);
    if (glow.current) glow.current.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 5.1 + seed) * 0.06;
  });

  return (
    <group position={[position[0], position[1] + TILE_HEIGHT / 2, position[2]]}>
      <mesh geometry={cover} position-y={COVER_Y - COVER_HEIGHT / 2}>
        <meshStandardMaterial
          color="#1a0a05"
          map={embers}
          emissive="#ff5a14"
          emissiveMap={embers}
          emissiveIntensity={0.9}
          roughness={1}
        />
      </mesh>
      <sprite ref={glow} position-y={COVER_HEIGHT + 0.25} scale={TILE_SIZE * 1.1}>
        <spriteMaterial map={disc} color="#ff6a1a" transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <group ref={root} position-y={COVER_HEIGHT - 0.02}>
        {FIRES.map(({ x, z, width }, index) => (
          <FlameCard
            key={index}
            width={width * TILE_SIZE}
            position={[x * TILE_SIZE, 0, z * TILE_SIZE]}
            seed={seed + index * 3.1}
          />
        ))}
      </group>
    </group>
  );
}
