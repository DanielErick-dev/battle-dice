"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, MeshStandardMaterial } from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { BellFrame } from "./BellFrame";
import { Censer } from "./Censer";
import { Lightning } from "./Lightning";
import { Pebbles } from "./Pebbles";
import { PrayerFlags } from "./PrayerFlags";
import { paintTerraceFloor, STONE } from "./textures";

/** The low parapet closing the terrace behind him: blocks along the back arc (angles in radians, -π/2 straight back). */
const PARAPET = { radius: 0.9, from: -2.55, to: -0.59, blocks: 7, height: 0.11, depth: 0.08 };

/**
 * The Wandering Sage's stage instead of the rune pedestal: a mountain monastery terrace of worn slabs, a stone
 * censer smoking, a bronze bell in its frame, prayer flags, and lightning flickering in the sky. Origin on the floor.
 */
export function StormTemple() {
  const floor = useCanvasTexture({ size: 512, draw: paintTerraceFloor, seed: 139, fadeFrom: 0.5 });
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: floor, transparent: true, roughness: 0.95, depthWrite: false }),
      // Two-sided so the inside of the censer's bowl shows.
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95, side: DoubleSide }),
      wood: new MeshStandardMaterial({ color: "#5a2e1c", roughness: 0.8 }),
      roof: new MeshStandardMaterial({ color: "#2f3a33", roughness: 0.7 }),
      bronze: new MeshStandardMaterial({ color: "#a8733a", metalness: 0.85, roughness: 0.38, side: DoubleSide }),
      ash: new MeshStandardMaterial({ color: "#3a3631", roughness: 1 }),
      rope: new MeshStandardMaterial({ color: "#c9b48a", roughness: 1 }),
    }),
    [floor, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const blocks = useMemo(
    () =>
      Array.from({ length: PARAPET.blocks }, (_, index) => {
        const angle = PARAPET.from + ((index + 0.5) / PARAPET.blocks) * (PARAPET.to - PARAPET.from);
        const span = ((PARAPET.to - PARAPET.from) / PARAPET.blocks) * PARAPET.radius;
        return { angle, span, worn: index % 3 === 1 };
      }),
    [],
  );

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {blocks.map(({ angle, span, worn }) => (
        <group
          key={angle}
          position={[Math.cos(angle) * PARAPET.radius, 0, Math.sin(angle) * PARAPET.radius]}
          rotation-y={-angle - Math.PI / 2}
        >
          <mesh material={materials.stone} position-y={PARAPET.height / 2}>
            <boxGeometry args={[span * 0.96, PARAPET.height * (worn ? 0.8 : 1), PARAPET.depth]} />
          </mesh>
          <mesh material={materials.stone} position-y={PARAPET.height + 0.012}>
            <boxGeometry args={[span, 0.024, PARAPET.depth * 1.3]} />
          </mesh>
        </group>
      ))}
      <Censer materials={materials} />
      <BellFrame materials={materials} />
      <PrayerFlags rope={materials.rope} wood={materials.wood} />
      <Pebbles />
      <Lightning />
    </group>
  );
}
