"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import {
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  type Group,
  type Mesh,
} from "three";
import { seededRandom, type RandomSource } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { FloorDecal, GroundDisc } from "../kit/Floor";
import { roughen } from "../kit/geometry";
import { useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { wave } from "../kit/motion";
import { useRefList } from "../kit/refs";
import { useCanvasTexture } from "../kit/textures";
import { useSpin } from "../kit/useSpin";
import { paintFissures, paintRiftFloor, paintVeins, paintVortex } from "./textures";

const FLOOR_RADIUS = 1;
const FISSURE = new Color("#a47bff").multiplyScalar(1.8);
const VOID_GLOW = "#7c3aed";
/** Slabs torn out of the ground, hanging behind him: `y` is the rest height, `size` the slab's width. */
const SHARDS = [
  { x: -0.74, z: -0.36, y: 0.5, size: 0.1 },
  { x: -0.5, z: -0.72, y: 1.02, size: 0.065 },
  { x: -0.2, z: -0.9, y: 0.32, size: 0.13 },
  { x: 0.24, z: -0.86, y: 0.78, size: 0.085 },
  { x: 0.56, z: -0.62, y: 0.42, size: 0.11 },
  { x: 0.78, z: -0.24, y: 1.12, size: 0.055 },
  { x: -0.82, z: 0.08, y: 0.22, size: 0.05 },
  { x: 0.05, z: -0.7, y: 1.38, size: 0.045 },
];
/** Chunks of obsidian still on the ground, half sunk. */
const RUBBLE = [
  { x: -0.6, z: -0.62, size: 0.08 },
  { x: 0.42, z: -0.82, size: 0.06 },
  { x: 0.74, z: 0.1, size: 0.05 },
  { x: -0.5, z: 0.42, size: 0.04 },
];
const SHARD_SHAPES = 3;

/**
 * The Void Knight's stage instead of the rune pedestal: cracked obsidian with violet fissures pulsing, slabs of
 * it floating behind him and a slow vortex of dark mist. Origin on the floor; glows are additive, not lights.
 */
export function VoidRift() {
  const obsidian = useCanvasTexture({ size: 512, draw: paintRiftFloor, fadeFrom: 0.5 });
  const fissures = useCanvasTexture({ size: 512, draw: paintFissures, fadeFrom: 0.5 });
  const veins = useCanvasTexture({ size: 512, draw: paintVeins, fadeFrom: 0.5 });
  const vortex = useCanvasTexture({ size: 256, draw: paintVortex });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({
        map: obsidian,
        transparent: true,
        roughness: 0.22,
        metalness: 0.35,
        depthWrite: false,
      }),
      fissures: new MeshBasicMaterial({ map: fissures, color: FISSURE, ...HOT_GLOW }),
      veins: new MeshBasicMaterial({ map: veins, color: FISSURE, ...HOT_GLOW }),
      mist: new MeshBasicMaterial({
        map: vortex,
        color: "#05020b",
        opacity: 0.7,
        transparent: true,
        depthWrite: false,
      }),
      swirl: new MeshBasicMaterial({ map: vortex, color: VOID_GLOW, opacity: 0.22, ...HOT_GLOW }),
      rock: new MeshStandardMaterial({
        color: "#130e1d",
        roughness: 0.18,
        metalness: 0.4,
        emissive: "#2a1055",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      hold: new SpriteMaterial({ map: disc, color: VOID_GLOW, opacity: 0.35, ...HOT_GLOW }),
    }),
    [obsidian, fissures, veins, vortex, disc],
  );
  useDisposal(materials);
  const geometries = useMemo(() => {
    const random = seededRandom(31);
    return {
      shards: Array.from({ length: SHARD_SHAPES }, () => slabGeometry(random)),
      rubble: roughen(new DodecahedronGeometry(1, 0), random, 0.45),
    };
  }, []);
  useDisposal(geometries);
  const [shards, bind] = useRefList<Group>();
  const mist = useSpin<Mesh>(0.12);
  const swirl = useSpin<Mesh>(-0.07);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Main rifts and their branches throb out of step, as if the light ran outwards along them.
    materials.fissures.setValues({ opacity: 0.62 + 0.3 * Math.sin(t * 1.6) + 0.05 * Math.sin(t * 7.3) });
    materials.veins.setValues({ opacity: 0.4 + 0.35 * Math.sin(t * 1.6 - 1.4) });
    SHARDS.forEach(({ x, z, y }, index) => {
      const shard = shards.current[index];
      if (!shard) return;
      const angle = Math.atan2(z, x) + wave(t, 0.06, 0.23, index * 1.7);
      const radius = Math.hypot(x, z);
      shard.position.set(Math.cos(angle) * radius, y + wave(t, 0.045, 0.7, index * 2.3), Math.sin(angle) * radius);
      shard.rotation.y = t * (0.1 + (index % 3) * 0.05) * (index % 2 ? 1 : -1);
    });
  });

  return (
    <group>
      <GroundDisc material={materials.floor} />
      <FloorDecal material={materials.veins} y={0.003} radius={FLOOR_RADIUS} />
      <FloorDecal material={materials.fissures} y={0.004} radius={FLOOR_RADIUS} />
      <FloorDecal ref={mist} material={materials.mist} y={0.012} renderOrder={2} size={1.9} />
      <FloorDecal ref={swirl} material={materials.swirl} y={0.016} renderOrder={3} size={2.1} />
      {SHARDS.map(({ size }, index) => (
        <group key={index} ref={bind(index)}>
          <mesh
            geometry={geometries.shards[index % SHARD_SHAPES]}
            material={materials.rock}
            rotation={[0.12 * (index % 3) - 0.1, 0, 0.1 * ((index % 4) - 1.5)]}
            scale={size}
          />
          <sprite material={materials.hold} position-y={-size * 1.2} scale={size * 5} />
        </group>
      ))}
      {RUBBLE.map(({ x, z, size }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.rubble}
          material={materials.rock}
          position={[x, size * 0.2, z]}
          rotation={[x * 3, z * 5, 0.4]}
          scale={[size * 1.3, size * 0.8, size]}
        />
      ))}
    </group>
  );
}

/** A floating island in small: a flat top torn from the floor, tapering to a jagged point below. Width 2. */
function slabGeometry(random: RandomSource) {
  const geometry = new CylinderGeometry(1, 0.12, 1.8, 6, 2);
  geometry.translate(0, -0.5, 0);
  return roughen(geometry, random, 0.5);
}
