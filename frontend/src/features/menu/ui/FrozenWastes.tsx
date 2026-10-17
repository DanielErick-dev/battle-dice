"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DodecahedronGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Group,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { iceShard } from "@/features/match/scene/character/ice";
import { seededRandom } from "@/game/domain/random";
import { useNoiseTexture, type NoiseLook } from "./stageTextures";

/** How far the patch of snow reaches round the figure before fading out. */
const SNOW_RADIUS = 1;
/**
 * Clusters of glacier ice jutting out of the snow, mostly behind him: where, how tall the tallest
 * shard, and how many shards. Uneven on purpose: a big mass on one side, smaller outcrops elsewhere.
 */
const CRYSTAL_CLUSTERS = [
  { x: -0.72, z: -0.52, height: 0.78, shards: 7 },
  { x: -0.3, z: -0.85, height: 0.4, shards: 4 },
  { x: 0.46, z: -0.78, height: 0.62, shards: 6 },
  { x: 0.84, z: -0.26, height: 0.3, shards: 3 },
  { x: -0.86, z: 0.24, height: 0.18, shards: 3 },
];
/** Snow-capped rocks half buried round the plot. */
const ROCKS = [
  { x: -0.5, z: -0.2, size: 0.09 },
  { x: 0.18, z: -0.6, size: 0.12 },
  { x: 0.55, z: 0.05, size: 0.07 },
  { x: -0.38, z: 0.48, size: 0.06 },
];
/** Snowflakes falling round him: how many, over how wide a column, from how high. */
const FLAKES = 140;
const FLAKE_SPREAD = 1.3;
const FLAKE_HEIGHT = 2.4;
/** Patches of cold mist drifting low over the snow. */
const MISTS = 8;

/**
 * Bjorn's stage in place of the rune pedestal: a patch of packed snow with clusters of glacier
 * crystals jutting out of it behind him, snow-capped rocks half buried round the plot, cold mist
 * drifting low over the ground and snow falling. Its origin is on the floor.
 */
export function FrozenWastes() {
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
      // Clear glacier ice: light passes through, tinted deep blue the thicker it is, with faint
      // frosting on the faces rather than a glow.
      ice: new MeshPhysicalMaterial({
        color: "#d8ecf7",
        transmission: 0.85,
        thickness: 0.25,
        ior: 1.31,
        attenuationColor: "#2b6ea6",
        attenuationDistance: 0.35,
        roughness: 0.18,
        metalness: 0,
        emissive: "#14385c",
        emissiveIntensity: 0.15,
        flatShading: true,
      }),
    }),
    [snow, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useEffect(() => () => rock.dispose(), [rock]);
  // Each shard its own uneven shape, so no two read as copies.
  const clusters = useMemo(() => {
    const random = seededRandom(11);
    return CRYSTAL_CLUSTERS.map((cluster) => ({
      ...cluster,
      // The tallest near upright in the middle; the rest shorter, fanning out from its foot.
      shards: Array.from({ length: cluster.shards }, (_, index) => {
        const main = index === 0;
        const height = main ? 1 : 0.3 + random() * 0.55;
        return {
          geometry: iceShard(random, main ? 0.075 : 0.05 + random() * 0.04, !main && random() < 0.3),
          angle: random() * Math.PI * 2,
          out: main ? 0 : 0.04 + random() * 0.08,
          lean: main ? random() * 0.12 : 0.3 + random() * 0.55,
          height,
          turn: random() * Math.PI,
        };
      }),
    }));
  }, []);
  useEffect(
    () => () => clusters.forEach(({ shards }) => shards.forEach(({ geometry }) => geometry.dispose())),
    [clusters],
  );

  return (
    <group>
      <mesh material={materials.snow} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[SNOW_RADIUS, 64]} />
      </mesh>
      {/* A low drift of snow he stands on, in place of the pedestal. */}
      <mesh material={materials.drift} position-y={-0.05} scale={[0.62, 0.05, 0.62]}>
        <sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {clusters.map(({ x, z, height, shards }) => (
        <group key={`${x}:${z}`} position={[x, -0.01, z]} scale={height}>
          {shards.map(({ geometry, angle, out, lean, height: shard, turn }, index) => (
            <group
              key={index}
              position={[Math.cos(angle) * out, 0, Math.sin(angle) * out]}
              rotation={[Math.sin(angle) * lean, 0, -Math.cos(angle) * lean]}
            >
              <mesh geometry={geometry} material={materials.ice} rotation-y={turn} scale={[1, shard, 1]} />
            </group>
          ))}
          {/* Snow banked up round the foot of the ice. */}
          <mesh material={materials.drift} position-y={-0.02} scale={[0.2, 0.06, 0.17]}>
            <sphereGeometry args={[1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {ROCKS.map(({ x, z, size }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh geometry={rock} material={materials.rock} scale={[size * 1.3, size * 0.7, size]} />
          {/* A cap of snow on top. */}
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

/** Pale patches of mist drifting slowly over the snow. */
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

/** Snowflakes drifting down round him, swaying, and starting again at the top. */
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

const SNOW: NoiseLook = {
  base: [214, 228, 240],
  dark: [160, 184, 208],
  light: [246, 250, 255],
  fadeOut: true,
};
const STONE: NoiseLook = {
  base: [58, 66, 78],
  dark: [30, 36, 46],
  light: [96, 108, 124],
  fadeOut: false,
};
