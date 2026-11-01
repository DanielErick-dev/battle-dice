"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { ConeGeometry, DodecahedronGeometry, MeshStandardMaterial, SphereGeometry, type Mesh } from "three";
import { useDisposal } from "../kit/dispose";
import { FloorDecal, GroundDisc } from "../kit/Floor";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { MoonGlints } from "./MoonGlints";
import { Shrine } from "./Shrine";
import { FOAM, RIPPLES, SAND, STONE, WATER_MASK } from "./textures";

/** Smooth stones on the sand: `size` is the long side; flattened as the tide leaves them. */
const STONES = [
  { x: -0.62, z: 0.12, size: 0.07, turn: 0.4 },
  { x: -0.48, z: 0.4, size: 0.045, turn: 1.2 },
  { x: 0.52, z: 0.22, size: 0.06, turn: -0.6 },
  { x: 0.7, z: -0.12, size: 0.04, turn: 2.1 },
  { x: 0.34, z: -0.32, size: 0.05, turn: 0.9 },
  { x: -0.28, z: -0.34, size: 0.035, turn: -1.4 },
];
const SCALLOPS = [
  { x: -0.4, z: 0.22, turn: 0.6, tint: "#e9cfc0" },
  { x: 0.38, z: 0.46, turn: -0.9, tint: "#f0e2cf" },
  { x: 0.6, z: 0.02, turn: 2.2, tint: "#d9a9a0" },
];
const SPIRALS = [
  { x: -0.7, z: -0.1, turn: 0.8 },
  { x: 0.22, z: 0.58, turn: -2.4 },
];
/** The cairn on the right, bottom stone first: [width, height]. */
const CAIRN: [number, number][] = [
  [0.13, 0.06],
  [0.1, 0.05],
  [0.075, 0.04],
  [0.05, 0.03],
];

/**
 * Themis's stage instead of the rune pedestal: a moonlit shore of wet sand, a sheet of shallow water with
 * its foam line washing in, shells and smooth stones, and a broken shrine half in the sea. Origin on the floor.
 */
export function MoonlitShore() {
  const sand = useCanvasTexture(SAND);
  const ripples = useCanvasTexture(RIPPLES);
  const waterMask = useCanvasTexture(WATER_MASK);
  const foam = useCanvasTexture(FOAM);
  const stoneMap = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      sand: new MeshStandardMaterial({ map: sand, transparent: true, roughness: 0.85, depthWrite: false }),
      water: new MeshStandardMaterial({
        color: "#3d6ea8",
        map: ripples,
        alphaMap: waterMask,
        transparent: true,
        roughness: 0.12,
        metalness: 0.35,
        depthWrite: false,
      }),
      foam: new MeshStandardMaterial({ map: foam, transparent: true, roughness: 0.6, depthWrite: false }),
      stone: new MeshStandardMaterial({ map: stoneMap, roughness: 0.8 }),
      // The courses the sea washes over, darker and greener with weed.
      sunken: new MeshStandardMaterial({ map: stoneMap, color: "#7f9a8e", roughness: 0.7 }),
      pebble: new MeshStandardMaterial({ color: "#5d6470", roughness: 0.35 }),
      shell: new MeshStandardMaterial({ color: "#f4e6d4", roughness: 0.5, flatShading: true }),
    }),
    [sand, ripples, waterMask, foam, stoneMap],
  );
  useDisposal(materials);
  const geometries = useMemo(
    () => ({
      pebble: new SphereGeometry(1, 14, 10),
      chunk: new DodecahedronGeometry(1, 0),
      // A quarter dome, flat-shaded so its facets read as the ribs of a scallop.
      scallop: new SphereGeometry(1, 9, 4, 0, Math.PI, 0, Math.PI / 2),
      spiral: new ConeGeometry(1, 1, 7, 1),
    }),
    [],
  );
  useDisposal(geometries);
  const foamSheet = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ripples.offset.set(Math.sin(t * 0.2) * 0.02, t * 0.035);
    // Washes up the sand and draws back, thinning as it reaches furthest.
    const wash = Math.sin(t * 0.55);
    const sheet = foamSheet.current;
    if (!sheet) return;
    sheet.position.z = 0.035 * wash;
    (sheet.material as MeshStandardMaterial).opacity = 0.75 - 0.3 * wash;
  });

  return (
    <group>
      <GroundDisc material={materials.sand} />
      <FloorDecal material={materials.water} y={0.012} renderOrder={1} size={2 * GROUND_RADIUS} />
      <FloorDecal ref={foamSheet} material={materials.foam} y={0.014} renderOrder={2} size={2 * GROUND_RADIUS} />
      <MoonGlints />
      <Shrine stone={materials.stone} sunken={materials.sunken} chunk={geometries.chunk} />
      <group position={[0.62, -0.02, -0.6]} rotation-y={0.4}>
        {CAIRN.map(([width, height], index) => {
          const y = CAIRN.slice(0, index).reduce((sum, [, below]) => sum + below * 1.7, 0) + height * 0.8;
          return (
            <mesh
              key={index}
              geometry={geometries.pebble}
              material={index === 0 ? materials.sunken : materials.pebble}
              position={[index * 0.006, y, (index % 2) * 0.008]}
              rotation-z={(index % 2 ? 1 : -1) * 0.12}
              scale={[width, height, width * 0.85]}
            />
          );
        })}
      </group>
      {STONES.map(({ x, z, size, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.pebble}
          material={materials.pebble}
          position={[x, size * 0.15, z]}
          rotation-y={turn}
          scale={[size, size * 0.38, size * 0.7]}
        />
      ))}
      {SCALLOPS.map(({ x, z, turn, tint }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.scallop}
          position={[x, 0, z]}
          rotation={[0, turn, 0]}
          scale={[0.032, 0.012, 0.03]}
        >
          <meshStandardMaterial color={tint} roughness={0.5} flatShading />
        </mesh>
      ))}
      {SPIRALS.map(({ x, z, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.spiral}
          material={materials.shell}
          position={[x, 0.012, z]}
          rotation={[0, turn, Math.PI / 2 - 0.15]}
          scale={[0.014, 0.05, 0.014]}
        />
      ))}
    </group>
  );
}
