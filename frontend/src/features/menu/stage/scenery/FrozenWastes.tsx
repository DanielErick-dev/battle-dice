"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, DodecahedronGeometry, MeshStandardMaterial, type Group } from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { PROP_HEIGHT, usePropMesh } from "@/features/match/scene/character/props";
import { seededRandom } from "@/game/domain/random";
import type { GroundDressing } from "./kit/groundDressing";
import { GROUND_RADIUS } from "./kit/geometry";
import { useNoiseTexture, type NoiseLook } from "./kit/textures";

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
const MISTS = 8;

/** Bjorn's stage instead of the rune pedestal: snow, frost crystals, rocks, mist and snowfall. Origin on the floor. */
export function FrozenWastes() {
  const crystal = usePropMesh("bjornCrystal");
  const snow = useNoiseTexture(SNOW);
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      snow: new MeshStandardMaterial({
        map: snow,
        transparent: true,
        roughness: 0.9,
        depthWrite: false,
      }),
      drift: new MeshStandardMaterial({ color: "#e8f2fb", roughness: 0.85 }),
      rock: new MeshStandardMaterial({
        map: stone,
        roughness: 0.95,
        flatShading: true,
      }),
    }),
    [snow, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useEffect(() => () => rock.dispose(), [rock]);
  return (
    <group>
      <mesh material={materials.snow} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {/* The snow drift he stands on, in place of the pedestal. */}
      <mesh material={materials.drift} position-y={-0.05} scale={[0.62, 0.05, 0.62]}>
        <sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
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
            <sphereGeometry args={[1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {ROCKS.map(({ x, z, size }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={rock} material={materials.rock} scale={[size * 1.3, size * 0.7, size]} />
          <mesh material={materials.drift} position-y={size * 0.45} scale={[size * 1.1, size * 0.3, size * 0.85]}>
            <sphereGeometry args={[1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      <ColdMist />
      <Snowfall />
    </group>
  );
}

function ColdMist() {
  const disc = useSoftDisc();
  const patches = useRef<(Group | null)[]>([]);
  const mist = useMemo(
    () =>
      Array.from({ length: MISTS }, (_, index) => ({
        radius: 0.4 + ((index * 0.37) % 0.5),
        angle: index * 2.4,
        speed: 0.05 * (index % 2 ? 1 : -1),
        size: 0.6 + (index % 3) * 0.18,
        height: 0.02 + (index % 3) * 0.035,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mist.forEach(({ radius, angle, speed, height, size }, index) => {
      const patch = patches.current[index];
      if (!patch) return;
      const at = angle + t * speed;
      patch.position.set(Math.cos(at) * radius, height, Math.sin(at) * radius);
      patch.scale.setScalar(size * (1 + 0.12 * Math.sin(t * 0.5 + index)));
    });
  });

  return (
    <>
      {mist.map((_, index) => (
        <group
          key={index}
          ref={(group) => {
            patches.current[index] = group;
          }}
        >
          <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={disc} color="#cfe6ff" opacity={0.14} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Snowfall() {
  const disc = useSoftDisc();
  const { geometry, flakes } = useMemo(() => {
    const random = seededRandom(23);
    const flakes = Array.from({ length: FLAKES }, () => ({
      x: (random() - 0.5) * 2 * FLAKE_SPREAD,
      z: (random() - 0.5) * 2 * FLAKE_SPREAD,
      height: random() * FLAKE_HEIGHT,
      speed: 0.12 + random() * 0.16,
      phase: random() * Math.PI * 2,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(FLAKES * 3), 3));
    return { geometry, flakes };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    flakes.forEach((flake, index) => {
      flake.height -= flake.speed * delta;
      if (flake.height < 0) flake.height += FLAKE_HEIGHT;
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

/** Bjorn's trail trampled through the snow, grey stones showing through, an icy blue. */
const FROZEN_GROUND: GroundDressing = {
  wash: { colour: "#60a5fa", alpha: 0.28 },
  path: {
    kind: "dirt",
    colour: "rgba(170,195,215,0.8)",
    edge: "rgba(110,140,170,0.45)",
    width: [0.14, 0.26],
    wind: 0.05,
  },
  litter: [
    { shape: "pebble", colours: ["#6b7280", "#9ca3af"], count: 45, size: 3 },
    { shape: "shard", colours: ["rgba(200,235,255,0.85)"], count: 40, size: 3 },
  ],
};
const SNOW: NoiseLook = {
  base: [214, 228, 240],
  dark: [160, 184, 208],
  light: [246, 250, 255],
  fadeOut: true,
  dress: FROZEN_GROUND,
};
const STONE: NoiseLook = {
  base: [58, 66, 78],
  dark: [30, 36, 46],
  light: [96, 108, 124],
  fadeOut: false,
};
