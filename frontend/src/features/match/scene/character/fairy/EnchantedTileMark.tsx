"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { SQUARE_SLAB, type SlabOutline } from "../../slab";
import { useAge } from "../../useAge";
import { COVER_HEIGHT, COVER_Y, useCoverGeometry } from "../shared/tileCover";
import { CRYSTALS, DRIFTS, useSnowTexture } from "./snowCover";
import { useGlowColor } from "../shared/glowColor";

const TILE_TOP = TILE_HEIGHT / 2;

/** The fairy's fresh white snow, or the violet snow of the Void when Zarek has taken it over. */
const LOOKS = {
  fairy: { slab: "#f4fbff", drift: "#f8fdff", shine: "#9fd8ff", crystal: "#e0fbff", dust: "#e0f7ff" },
  void: { slab: "#c7b2f2", drift: "#cdb9f5", shine: "#6d28d9", crystal: "#d9c8ff", dust: "#b794ff" },
} as const;

/**
 * A tile the Crystal Fairy enchanted: buried for good under fresh snow, a smooth white slab with
 * drifts heaped where the spikes were and a couple of ice crystals, so nothing of what it was
 * shows. Fairy dust glitters over it in her colour. Snows in as it's enchanted.
 */
export function EnchantedTileMark({
  position,
  color,
  outline = SQUARE_SLAB,
  look = "fairy",
}: {
  position: Vec3;
  color: string;
  look?: keyof typeof LOOKS;
  /** The slab it covers (see BoardLayout.slab): the snow takes its shape. */
  outline?: SlabOutline;
}) {
  const cover = useCoverGeometry(outline);
  const root = useRef<Group>(null);
  const snow = useSnowTexture();
  const glow = useGlowColor(color, 1.4);
  const age = useAge();
  const tint = LOOKS[look];

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    root.current?.scale.set(1, Math.min(1, 0.05 + t * 1.6), 1);
    root.current?.children.forEach((child) => {
      if (child.userData.crystal) child.rotation.y += 0.004;
    });
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <mesh geometry={cover} position-y={COVER_Y - COVER_HEIGHT / 2} receiveShadow>
        <meshStandardMaterial
          color={tint.slab}
          map={snow}
          roughness={0.95}
          emissive={tint.shine}
          emissiveIntensity={look === "void" ? 0.25 : 0.12}
        />
      </mesh>
      {DRIFTS.map(({ x, z, radius }) => (
        <mesh
          key={`${x}:${z}`}
          position={[x * TILE_SIZE, COVER_HEIGHT - 0.03, z * TILE_SIZE]}
          scale={[radius * TILE_SIZE, radius * 0.9, radius * TILE_SIZE]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={tint.drift}
            map={snow}
            roughness={0.9}
            emissive={tint.shine}
            emissiveIntensity={look === "void" ? 0.2 : 0.1}
          />
        </mesh>
      ))}
      {CRYSTALS.map(({ x, z, height, turn }) => (
        <mesh
          key={`${x}:${z}`}
          userData={{ crystal: true }}
          position={[x * TILE_SIZE, COVER_HEIGHT + height * 0.35, z * TILE_SIZE]}
          rotation-y={turn}
          scale={[0.08, height, 0.08]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={tint.crystal}
            emissive={glow}
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <Sparkles
        count={14}
        scale={[TILE_SIZE * 0.9, 0.8, TILE_SIZE * 0.9]}
        position-y={0.45}
        size={2.5}
        speed={0.3}
        color={tint.dust}
      />
    </group>
  );
}
