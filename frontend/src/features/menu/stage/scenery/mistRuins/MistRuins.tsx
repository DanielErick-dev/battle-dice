"use client";

import { useMemo } from "react";
import { Color, CylinderGeometry, MeshStandardMaterial, SpriteMaterial } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { GroundDisc } from "../kit/Floor";
import { roughen } from "../kit/geometry";
import { useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { Fog } from "./Fog";
import { paintMoon, paintRuinFloor, STONE } from "./textures";
import { TRAIL, Wisps } from "./Wisps";

const GHOST = new Color("#9be3ff").multiplyScalar(1.6);
const COLUMN_RADIUS = 0.075;
/** `broken` columns end in a jagged stump instead of their capital. */
const COLUMNS = [
  { x: -0.68, z: -0.5, height: 1.25, broken: false, lean: 0.03 },
  { x: -0.26, z: -0.88, height: 0.55, broken: true, lean: -0.05 },
  { x: 0.46, z: -0.8, height: 0.9, broken: true, lean: 0.06 },
  { x: 0.8, z: -0.36, height: 0.32, broken: true, lean: 0 },
];
/** Fallen masonry: `size` is [width, height, depth]. */
const BLOCKS = [
  { x: -0.52, z: -0.7, size: [0.2, 0.1, 0.14], turn: 0.4, tilt: 0.05 },
  { x: -0.42, z: -0.82, size: [0.12, 0.08, 0.1], turn: -0.7, tilt: 0.3 },
  { x: 0.16, z: -0.88, size: [0.22, 0.12, 0.15], turn: 0.15, tilt: 0 },
  { x: 0.66, z: -0.6, size: [0.14, 0.09, 0.12], turn: 1.1, tilt: -0.2 },
  { x: -0.8, z: 0.12, size: [0.13, 0.07, 0.1], turn: 0.6, tilt: 0.1 },
] as const;
/** A column drum that toppled and lies on its side. */
const DRUM = { x: 0.7, z: 0.02, length: 0.26, turn: 0.5 };
const MOON = { x: 0.62, y: 1.75, z: -1.15 };

/**
 * The Shadow Warden's stage instead of the rune pedestal: moonlit ruins, broken columns and fallen stones, fog
 * creeping low and pale wisps wandering between them. Origin on the floor; wisps and moon are sprites.
 */
export function MistRuins() {
  const paving = useCanvasTexture({ size: 512, draw: paintRuinFloor, fadeFrom: 0.5 });
  const stone = useNoiseTexture(STONE);
  const disc = useSoftDisc();
  const moon = useCanvasTexture({ size: 128, draw: paintMoon });
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: paving, transparent: true, roughness: 0.95, depthWrite: false }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95 }),
      fluted: new MeshStandardMaterial({ map: stone, roughness: 0.9, flatShading: true }),
      moon: new SpriteMaterial({ map: moon, color: "#dbe8ff", transparent: true, depthWrite: false, fog: false }),
      moonHalo: new SpriteMaterial({ map: disc, ...HOT_GLOW, color: "#5b7fb3", opacity: 0.35 }),
      trail: Array.from(
        { length: TRAIL },
        (_, index) => new SpriteMaterial({ map: disc, ...HOT_GLOW, color: GHOST, opacity: 0.75 * (1 - index / TRAIL) }),
      ),
      aura: new SpriteMaterial({ map: disc, ...HOT_GLOW, color: "#4aa8d8", opacity: 0.18 }),
    }),
    [paving, stone, moon, disc],
  );
  useDisposal(materials);
  const stumps = useMemo(() => {
    const random = seededRandom(61);
    return COLUMNS.map(() =>
      roughen(new CylinderGeometry(COLUMN_RADIUS * 0.85, COLUMN_RADIUS, 0.12, 10, 2), random, 0.06),
    );
  }, []);
  useDisposal(stumps);

  return (
    <group>
      <GroundDisc material={materials.floor} />
      <sprite material={materials.moonHalo} position={[MOON.x, MOON.y, MOON.z]} scale={1.1} renderOrder={-2} />
      <sprite material={materials.moon} position={[MOON.x, MOON.y, MOON.z]} scale={0.3} renderOrder={-2} />
      {COLUMNS.map(({ x, z, height, broken, lean }, index) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation-z={lean}>
          <mesh material={materials.stone} position-y={0.03}>
            <boxGeometry args={[COLUMN_RADIUS * 3, 0.06, COLUMN_RADIUS * 3]} />
          </mesh>
          {/* Ten flat sides catch the moon like flutes. */}
          <mesh material={materials.fluted} position-y={0.06 + height / 2}>
            <cylinderGeometry args={[COLUMN_RADIUS * 0.9, COLUMN_RADIUS, height, 10]} />
          </mesh>
          {broken ? (
            <mesh geometry={stumps[index]} material={materials.fluted} position-y={0.06 + height + 0.03} />
          ) : (
            <group position-y={0.06 + height}>
              <mesh material={materials.stone} position-y={0.025}>
                <cylinderGeometry args={[COLUMN_RADIUS * 1.35, COLUMN_RADIUS * 0.9, 0.05, 12]} />
              </mesh>
              <mesh material={materials.stone} position-y={0.07}>
                <boxGeometry args={[COLUMN_RADIUS * 3, 0.04, COLUMN_RADIUS * 3]} />
              </mesh>
            </group>
          )}
        </group>
      ))}
      {BLOCKS.map(({ x, z, size, turn, tilt }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.stone}
          position={[x, size[1] / 2 - 0.01, z]}
          rotation={[tilt, turn, tilt * 0.5]}
        >
          <boxGeometry args={[...size]} />
        </mesh>
      ))}
      <mesh
        material={materials.fluted}
        position={[DRUM.x, COLUMN_RADIUS * 0.95, DRUM.z]}
        rotation={[0, DRUM.turn, Math.PI / 2]}
      >
        <cylinderGeometry args={[COLUMN_RADIUS, COLUMN_RADIUS, DRUM.length, 10]} />
      </mesh>
      <Fog />
      <Wisps trail={materials.trail} aura={materials.aura} />
    </group>
  );
}
