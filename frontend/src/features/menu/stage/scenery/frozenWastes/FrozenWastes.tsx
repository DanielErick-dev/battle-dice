"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { DodecahedronGeometry, MeshStandardMaterial } from "three";
import { seededRandom } from "@/game/domain/random";
import { useDisposal } from "../kit/dispose";
import { GroundDisc } from "../kit/Floor";
import { dome } from "../kit/geometry";
import { usePointBuffers } from "../kit/GlowPoints";
import { GroundMist, type MistLook, type MistPatch } from "../kit/GroundMist";
import { PROP_HEIGHT, usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { fall } from "../kit/motion";
import { useNoiseTexture } from "../kit/textures";
import { SNOW, STONE } from "./textures";

/** Bjorn's frost crystals (bjornCrystal): one big mass behind him, smaller outcrops elsewhere. */
const CRYSTALS = [
  { x: -0.72, z: -0.52, height: 0.8, turn: 0.4 },
  { x: -0.3, z: -0.88, height: 0.42, turn: 2.1 },
  { x: 0.48, z: -0.78, height: 0.62, turn: -0.8 },
  { x: 0.84, z: -0.26, height: 0.3, turn: 1.3 },
  { x: -0.86, z: 0.24, height: 0.2, turn: 2.8 },
];
const ROCKS = [
  { x: -0.5, z: -0.2, size: 0.09 },
  { x: 0.18, z: -0.6, size: 0.12 },
  { x: 0.55, z: 0.05, size: 0.07 },
  { x: -0.38, z: 0.48, size: 0.06 },
];
const FLAKES = 140;
const FLAKE_SPREAD = 1.3;
const FLAKE_HEIGHT = 2.4;
const MIST: MistPatch[] = Array.from({ length: 8 }, (_, index) => ({
  radius: 0.4 + ((index * 0.37) % 0.5),
  angle: index * 2.4,
  speed: 0.05 * (index % 2 ? 1 : -1),
  size: 0.6 + (index % 3) * 0.18,
  height: 0.02 + (index % 3) * 0.035,
  phase: index,
}));
const MIST_LOOK: MistLook = { colour: "#cfe6ff", opacity: 0.14, renderOrder: 3, breath: 0.5 };

/** Bjorn's stage instead of the rune pedestal: snow, frost crystals, rocks, mist and snowfall. Origin on the floor. */
export function FrozenWastes() {
  const crystal = usePropMesh("bjornCrystal");
  const snow = useNoiseTexture(SNOW);
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      snow: new MeshStandardMaterial({ map: snow, transparent: true, roughness: 0.9, depthWrite: false }),
      drift: new MeshStandardMaterial({ color: "#e8f2fb", roughness: 0.85 }),
      rock: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
    }),
    [snow, stone],
  );
  useDisposal(materials);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useDisposal(rock);

  return (
    <group>
      <GroundDisc material={materials.snow} />
      {/* The snow drift he stands on, in place of the pedestal. */}
      <mesh material={materials.drift} position-y={-0.05} scale={[0.62, 0.05, 0.62]}>
        <sphereGeometry args={dome(32, 12)} />
      </mesh>
      {CRYSTALS.map(({ x, z, height, turn }) => (
        <group key={`${x}:${z}`} position={[x, -0.01, z]} rotation-y={turn}>
          <mesh
            geometry={crystal.geometry}
            material={crystal.material}
            position-y={height / 2}
            scale={height / PROP_HEIGHT}
          />
          <mesh material={materials.drift} position-y={-0.02} scale={[height * 0.3, height * 0.08, height * 0.26]}>
            <sphereGeometry args={dome(14, 6)} />
          </mesh>
        </group>
      ))}
      {ROCKS.map(({ x, z, size }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={rock} material={materials.rock} scale={[size * 1.3, size * 0.7, size]} />
          <mesh material={materials.drift} position-y={size * 0.45} scale={[size * 1.1, size * 0.3, size * 0.85]}>
            <sphereGeometry args={dome(12, 6)} />
          </mesh>
        </group>
      ))}
      <GroundMist patches={MIST} look={MIST_LOOK} />
      <Snowfall />
    </group>
  );
}

/** Flakes drifting down over the whole stage, swaying as they fall. */
function Snowfall() {
  const disc = useSoftDisc();
  const flakes = useMemo(() => {
    const random = seededRandom(23);
    return Array.from({ length: FLAKES }, () => ({
      x: (random() - 0.5) * 2 * FLAKE_SPREAD,
      z: (random() - 0.5) * 2 * FLAKE_SPREAD,
      height: random() * FLAKE_HEIGHT,
      speed: 0.12 + random() * 0.16,
      phase: random() * Math.PI * 2,
    }));
  }, []);
  const geometry = usePointBuffers(FLAKES, false);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position");
    const t = clock.elapsedTime;
    flakes.forEach((flake, index) => {
      flake.height = fall(flake.height, flake.speed * delta, FLAKE_HEIGHT);
      positions.setXYZ(
        index,
        flake.x + Math.sin(t * 0.8 + flake.phase) * 0.08,
        flake.height,
        flake.z + Math.cos(t * 0.6 + flake.phase) * 0.05,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial map={disc} color="#f4faff" size={0.035} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}
