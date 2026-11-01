"use client";

import { useEffect, useMemo } from "react";
import { DodecahedronGeometry, MeshStandardMaterial } from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { Elements } from "./Elements";
import { LeafSpiral } from "./LeafSpiral";
import { LowClouds } from "./LowClouds";
import { WindStreaks } from "./WindStreaks";
import { WindsweptGrass } from "./WindsweptGrass";
import { paintPeakFloor, STONE } from "./textures";

/** Crags of the summit behind him (`height` above the ground, sunk a little), and loose boulders. */
const CRAGS = [
  { x: -0.66, z: -0.62, size: 0.26, height: 0.42, turn: 0.4 },
  { x: -0.38, z: -0.86, size: 0.18, height: 0.26, turn: 1.2 },
  { x: 0.5, z: -0.78, size: 0.24, height: 0.34, turn: 2.1 },
  { x: 0.78, z: -0.4, size: 0.14, height: 0.18, turn: 0.8 },
  { x: -0.82, z: 0.12, size: 0.08, height: 0.08, turn: 2.6 },
  { x: 0.62, z: 0.3, size: 0.06, height: 0.06, turn: 1.7 },
  { x: 0.16, z: -0.62, size: 0.07, height: 0.07, turn: 0.2 },
];

/** A cairn of flat stones, bottom up: size and how far each sits off the one below. */
const CAIRN = { x: 0.2, z: -0.86, stones: [0.11, 0.085, 0.07, 0.05, 0.035] };

/**
 * Zéfiro's stage instead of the rune pedestal: a windswept summit, crags and a cairn, grass bent by the wind,
 * the four elements circling him, leaves caught in a rising spiral and wind streaks. Origin on the floor.
 */
export function WindPeak() {
  const ground = useCanvasTexture({ size: 512, draw: paintPeakFloor, seed: 107, fadeFrom: 0.45 });
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: ground, transparent: true, roughness: 1, depthWrite: false }),
      rock: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
      lichen: new MeshStandardMaterial({ color: "#7d8f5a", roughness: 1, flatShading: true }),
    }),
    [ground, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useEffect(() => () => rock.dispose(), [rock]);

  return (
    <group>
      <mesh material={materials.ground} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {CRAGS.map(({ x, z, size, height, turn }) => (
        <group key={`${x}:${z}`} position={[x, height * 0.35, z]} rotation-y={turn}>
          <mesh geometry={rock} material={materials.rock} scale={[size, height * 0.75, size * 0.8]} />
          {/* Lichen on the side the weather doesn't scour. */}
          {size > 0.1 && (
            <mesh
              geometry={rock}
              material={materials.lichen}
              position={[0, height * 0.32, 0]}
              scale={[size * 0.7, height * 0.12, size * 0.55]}
            />
          )}
        </group>
      ))}
      <group position={[CAIRN.x, 0, CAIRN.z]}>
        {CAIRN.stones.map((size, index) => {
          const y = CAIRN.stones.slice(0, index).reduce((sum, below) => sum + below * 0.72, 0) + size * 0.38;
          return (
            <mesh
              key={index}
              geometry={rock}
              material={materials.rock}
              position={[(index % 2 ? 0.01 : -0.008) * index, y, 0]}
              rotation-y={index * 1.3}
              scale={[size, size * 0.38, size * 0.85]}
            />
          );
        })}
      </group>
      <WindsweptGrass />
      <Elements />
      <LeafSpiral />
      <WindStreaks />
      <LowClouds />
    </group>
  );
}
