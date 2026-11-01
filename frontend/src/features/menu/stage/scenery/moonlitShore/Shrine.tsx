"use client";

import { useMemo } from "react";
import { Color, MeshStandardMaterial, SpriteMaterial, type DodecahedronGeometry } from "three";
import { useDisposal } from "../kit/dispose";
import { FlickerSprite } from "../kit/FlickerSprite";
import { dome } from "../kit/geometry";
import { useSoftDisc } from "../kit/matchAssets";
import { GLOW, HOT_GLOW } from "../kit/materials";
import type { FlameShape, Flicker } from "../kit/motion";

const VOTIVE = new Color("#9cc8ff").multiplyScalar(2.4);
const VOTIVE_FLICKER: Flicker = { slow: [0.1, 11], fast: [0.06, 23] };
const VOTIVE_FLAME: FlameShape = { kind: "stretch", width: 0.035, height: 0.06 };
const R = 0.055;

/** A plinth sunk in the shallows, its column snapped off, a stone shield with a glowing rune and a votive light. */
export function Shrine({
  stone,
  sunken,
  chunk,
}: {
  stone: MeshStandardMaterial;
  sunken: MeshStandardMaterial;
  chunk: DodecahedronGeometry;
}) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      rune: new MeshStandardMaterial({
        color: "#0b1830",
        emissive: "#5aa2ff",
        emissiveIntensity: 1.2,
        toneMapped: false,
      }),
      votive: new SpriteMaterial({ map: disc, color: VOTIVE, ...HOT_GLOW }),
      halo: new SpriteMaterial({ map: disc, color: "#5b8fe0", opacity: 0.2, ...GLOW }),
    }),
    [disc],
  );
  useDisposal(materials);

  return (
    <group position={[-0.56, -0.03, -0.68]} rotation-y={0.45}>
      <mesh material={sunken} position-y={0.02}>
        <boxGeometry args={[0.38, 0.08, 0.3]} />
      </mesh>
      <mesh material={sunken} position-y={0.085}>
        <boxGeometry args={[0.27, 0.05, 0.22]} />
      </mesh>
      <mesh material={stone} position-y={0.11 + 0.2}>
        <cylinderGeometry args={[R * 0.9, R, 0.4, 12]} />
      </mesh>
      <mesh geometry={chunk} material={stone} position-y={0.52} rotation-y={0.7} scale={[R, R * 0.55, R]} />
      {/* The rest of the column, toppled into the water. */}
      <mesh material={stone} position={[0.26, 0.02, 0.14]} rotation={[0.1, -0.5, Math.PI / 2]}>
        <cylinderGeometry args={[R * 0.9, R * 0.9, 0.22, 12]} />
      </mesh>
      <mesh geometry={chunk} material={stone} position={[-0.2, 0.01, 0.12]} scale={[0.04, 0.03, 0.035]} />
      {/* Her bulwark carved in stone, leant against the column. */}
      <group position={[0, 0.2, R + 0.03]} rotation-x={Math.PI / 2 - 0.25}>
        <mesh material={stone}>
          <cylinderGeometry args={[0.075, 0.075, 0.014, 20]} />
        </mesh>
        <mesh material={materials.rune} position-y={0.008} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.05, 0.005, 6, 28]} />
        </mesh>
        <mesh material={materials.rune} position-y={0.009}>
          <sphereGeometry args={dome(10, 6, 0.012)} />
        </mesh>
      </group>
      <group position={[0.1, 0.11, 0.07]}>
        <mesh material={stone} position-y={0.012}>
          <cylinderGeometry args={[0.014, 0.016, 0.024, 10]} />
        </mesh>
        <FlickerSprite material={materials.votive} look={VOTIVE_FLICKER} shape={VOTIVE_FLAME} position={[0, 0.05, 0]} />
        <sprite material={materials.halo} position-y={0.04} scale={0.35} />
      </group>
    </group>
  );
}
