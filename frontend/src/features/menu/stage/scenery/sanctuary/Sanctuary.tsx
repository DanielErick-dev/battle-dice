"use client";

import { useMemo, type RefObject } from "react";
import { Color, DodecahedronGeometry, MeshStandardMaterial, type Mesh } from "three";
import { useDisposal } from "../kit/dispose";
import { useRuneTexture } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { useNoiseTexture } from "../kit/textures";
import { useSpin } from "../kit/useSpin";
import { Column } from "./Column";
import { DriftingFeathers } from "./DriftingFeathers";
import { CloudSea, LightRays } from "./Sky";
import { DAIS_TOP, MARBLE } from "./textures";

const DAIS_RADIUS = 0.6;
const DAIS_STEP = 0.06;
const GOLD = "#e8b84a";
const RUNE_GLOW = new Color(GOLD).multiplyScalar(1.4);
const COLUMNS = [
  { x: -0.66, z: -0.58, height: 1.35, broken: false, lean: 0 },
  { x: -0.32, z: -0.9, height: 0.85, broken: true, lean: 0.04 },
  { x: 0.36, z: -0.88, height: 1.15, broken: false, lean: -0.02 },
  { x: 0.66, z: -0.52, height: 0.55, broken: true, lean: -0.06 },
];

/**
 * Seraphiel's stage instead of the rune pedestal: a marble dais over clouds, columns, feathers, rays of light.
 * Shakes in the wind of his wingbeats (`gust`, 0 to 1). Origin on the floor.
 */
export function Sanctuary({ gust: wind }: { gust: RefObject<number> }) {
  const marble = useNoiseTexture(MARBLE);
  const top = useNoiseTexture(DAIS_TOP);
  const runes = useRuneTexture();
  const ring = useSpin<Mesh>(0.12);
  const materials = useMemo(
    () => ({
      marble: new MeshStandardMaterial({ map: marble, roughness: 0.35, metalness: 0.05 }),
      top: new MeshStandardMaterial({ map: top, roughness: 0.35, metalness: 0.05 }),
      gold: new MeshStandardMaterial({
        color: GOLD,
        metalness: 0.9,
        roughness: 0.25,
        emissive: "#7a5410",
        emissiveIntensity: 0.4,
      }),
    }),
    [marble, top],
  );
  useDisposal(materials);
  const rubble = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useDisposal(rubble);

  return (
    <group>
      {/* Drawn first without depth, so a foot dipping below the top still shows. */}
      <mesh material={materials.marble} position-y={-DAIS_STEP / 2} renderOrder={-1}>
        <cylinderGeometry args={[DAIS_RADIUS, DAIS_RADIUS, DAIS_STEP, 48]} />
      </mesh>
      <mesh material={materials.marble} position-y={-DAIS_STEP * 1.5}>
        <cylinderGeometry args={[DAIS_RADIUS * 1.22, DAIS_RADIUS * 1.26, DAIS_STEP, 48]} />
      </mesh>
      <mesh material={materials.gold} position-y={-0.004} rotation-x={Math.PI / 2}>
        <torusGeometry args={[DAIS_RADIUS, 0.012, 8, 64]} />
      </mesh>
      <mesh material={materials.gold} position-y={-DAIS_STEP - 0.004} rotation-x={Math.PI / 2}>
        <torusGeometry args={[DAIS_RADIUS * 1.22, 0.01, 8, 64]} />
      </mesh>
      {/* Its top: the dressed marble, so the gold way and the feathers stay off the sides. */}
      <mesh material={materials.top} position-y={0.001} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[DAIS_RADIUS, 64]} />
      </mesh>
      <mesh ref={ring} position-y={0.002} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[DAIS_RADIUS * 0.94, 64]} />
        <meshBasicMaterial map={runes} color={RUNE_GLOW} {...HOT_GLOW} />
      </mesh>
      {COLUMNS.map((column) => (
        <Column
          key={`${column.x}:${column.z}`}
          {...column}
          foot={-DAIS_STEP * 2}
          materials={materials}
          rubble={rubble}
          wind={wind}
        />
      ))}
      <DriftingFeathers wind={wind} />
      <CloudSea wind={wind} />
      <LightRays wind={wind} />
    </group>
  );
}
