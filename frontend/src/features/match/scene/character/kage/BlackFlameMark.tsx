"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type Group } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { SQUARE_SLAB, type SlabOutline } from "../../slab";
import { useAge } from "../../useAge";
import { PROP_HEIGHT, usePropMesh } from "../core/props";
import { COVER_HEIGHT, COVER_Y, useCoverGeometry } from "../shared/tileCover";
import { FIRE_EMBER_GLOW, FIRE_MODEL_BOTTOM, FIRES, FLAME_TIME, useEmberTexture, useFireMaterial } from "./blackFire";

const TILE_TOP = TILE_HEIGHT / 2;

/**
 * A tile under the Kunoichi's black fire (Amaterasu): the tile is gone under a charred, smouldering
 * slab, and black flames edged in red burn all over it, swaying and breathing slowly (their height
 * and glow rise and fall), sparks rising off them. Flares up as it's lit.
 */
export function BlackFlameMark({
  position,
  color,
  outline = SQUARE_SLAB,
}: {
  position: Vec3;
  color: string;
  /** The slab it burns on (see BoardLayout.slab): the charred cover takes its shape. */
  outline?: SlabOutline;
}) {
  const cover = useCoverGeometry(outline);
  const root = useRef<Group>(null);
  const fires = useRef<(Group | null)[]>([]);
  const age = useAge();
  const rim = useMemo(() => new Color(color), [color]);
  const embers = useEmberTexture();
  const { geometry } = usePropMesh("blackFlame");
  const fire = useFireMaterial();

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const now = clock.elapsedTime;
    root.current?.scale.set(1, Math.min(1, 0.1 + t * 2.5), 1);
    FLAME_TIME.value = now;
    // Breathing: each fire rises and settles slowly, out of step with the others.
    fires.current.forEach((node, index) => {
      if (!node) return;
      const phase = now + index * 1.7;
      const jump = Math.sin(phase * 2.3) * 0.05 + Math.sin(phase * 3.9) * 0.025;
      node.scale.set(1 - jump * 0.3, 1 + jump, 1 - jump * 0.3);
    });
    fire.setValues({
      emissiveIntensity: FIRE_EMBER_GLOW * (1 + Math.sin(now * 2.6) * 0.25 + Math.sin(now * 4.1) * 0.15),
    });
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <mesh geometry={cover} position-y={COVER_Y - COVER_HEIGHT / 2}>
        <meshStandardMaterial
          color="#0b0507"
          map={embers}
          emissive={rim}
          emissiveMap={embers}
          emissiveIntensity={0.45}
          roughness={1}
        />
      </mesh>
      {FIRES.map(({ x, z, height, turn }, index) => (
        <group
          key={index}
          ref={(node) => {
            fires.current[index] = node;
          }}
          position={[x * TILE_SIZE, COVER_HEIGHT - 0.03, z * TILE_SIZE]}
          rotation-y={turn}
        >
          <mesh
            geometry={geometry}
            material={fire}
            scale={height / PROP_HEIGHT}
            position-y={(FIRE_MODEL_BOTTOM * height) / PROP_HEIGHT}
          />
        </group>
      ))}
      <Sparkles
        count={18}
        scale={[TILE_SIZE * 0.9, 1.6, TILE_SIZE * 0.9]}
        position-y={0.9}
        size={3}
        speed={1.2}
        color={color}
      />
    </group>
  );
}
