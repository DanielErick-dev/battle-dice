"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, MeshStandardMaterial, Shape } from "three";
import { useDisposal } from "../kit/dispose";
import { GroundDisc } from "../kit/Floor";
import { dome } from "../kit/geometry";
import { GroundMist, type MistLook, type MistPatch } from "../kit/GroundMist";
import { Prop, usePropMesh } from "../kit/matchAssets";
import { useNoiseTexture } from "../kit/textures";
import { MOUND, SOIL, STONE } from "./textures";

const HEADSTONES = [
  { x: -0.66, z: -0.42, height: 0.34, turn: 0.5, lean: -0.12, tilt: 0.05 },
  { x: -0.3, z: -0.72, height: 0.42, turn: 0.15, lean: 0.06, tilt: -0.1 },
  { x: 0.28, z: -0.76, height: 0.38, turn: -0.2, lean: -0.08, tilt: 0.14 },
  { x: 0.68, z: -0.45, height: 0.3, turn: -0.55, lean: 0.15, tilt: -0.06 },
];
const MOUNDS = [
  { x: -0.6, z: 0.32, turn: 0.5 },
  { x: 0.62, z: 0.26, turn: -0.45 },
];
/** Dark mist patches on the ground, and pale wisps above them. */
const SHADOWS = 9;
const WISPS = 6;
const MIST: MistPatch[] = Array.from({ length: SHADOWS + WISPS }, (_, index) => {
  const wisp = index >= SHADOWS;
  return {
    radius: 0.35 + ((index * 0.37) % 0.55),
    angle: index * 2.4,
    speed: (wisp ? 0.07 : 0.04) * (index % 2 ? 1 : -1),
    size: wisp ? 0.5 + (index % 3) * 0.15 : 0.55 + (index % 4) * 0.12,
    height: wisp ? 0.05 + (index % 3) * 0.04 : 0.006 + index * 0.001,
    phase: index,
  };
});
const SHADOW_PATCHES = MIST.slice(0, SHADOWS);
const WISP_PATCHES = MIST.slice(SHADOWS);
const SHADOW_LOOK: MistLook = { colour: "#050605", opacity: 0.55, renderOrder: 2, breath: 0.5 };
const WISP_LOOK: MistLook = { colour: "#7d8a78", opacity: 0.1, renderOrder: 3, breath: 0.5 };

/** The Necromancer's stage instead of the rune pedestal: turned earth, headstones, a cross, graves. Origin on the floor. */
export function Graveyard() {
  const soil = useNoiseTexture(SOIL);
  // The mounds take the bare grain: the track and its litter belong on the ground.
  const mounds = useNoiseTexture(MOUND);
  const stone = useNoiseTexture(STONE);
  const skull = usePropMesh("skull");
  const materials = useMemo(
    () => ({
      earth: new MeshStandardMaterial({ map: soil, transparent: true, roughness: 1, depthWrite: false }),
      mound: new MeshStandardMaterial({ map: mounds, color: "#8a8279", roughness: 1 }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95 }),
      wood: new MeshStandardMaterial({ color: "#2a2018", roughness: 1 }),
      skull: Object.assign(skull.material.clone(), { color: skull.material.color.clone().multiplyScalar(0.6) }),
    }),
    [soil, mounds, stone, skull.material],
  );
  useDisposal(materials);
  const headstone = useMemo(() => headstoneGeometry(), []);
  useDisposal(headstone);

  return (
    <group>
      <GroundDisc material={materials.earth} />
      {HEADSTONES.map(({ x, z, height, turn, lean, tilt }) => (
        <group key={`${x}:${z}`} position={[x, -0.03, z]} rotation={[lean, turn, tilt]} scale={height}>
          <mesh geometry={headstone} material={materials.stone} />
        </group>
      ))}
      <group position={[0.0, -0.02, -0.86]} rotation={[0.08, 0.1, -0.18]}>
        <mesh material={materials.wood} position-y={0.2}>
          <boxGeometry args={[0.035, 0.42, 0.03]} />
        </mesh>
        <mesh material={materials.wood} position-y={0.3} rotation-z={0.06}>
          <boxGeometry args={[0.22, 0.035, 0.03]} />
        </mesh>
      </group>
      {MOUNDS.map(({ x, z, turn }) => (
        <mesh key={x} material={materials.mound} position={[x, -0.02, z]} rotation-y={turn} scale={[0.11, 0.045, 0.24]}>
          <sphereGeometry args={dome(20, 12)} />
        </mesh>
      ))}
      <group position={[-0.3, 0.02, 0.52]} rotation={[0.35, 0.7, 0.25]}>
        <Prop geometry={skull.geometry} material={materials.skull} height={0.1} />
      </group>
      <GroundMist patches={SHADOW_PATCHES} look={SHADOW_LOOK} />
      <GroundMist patches={WISP_PATCHES} look={WISP_LOOK} />
    </group>
  );
}

/** A round-topped slab 1 tall, standing on its origin and facing +Z. */
function headstoneGeometry(): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(-0.32, 0);
  shape.lineTo(-0.32, 0.68);
  shape.absarc(0, 0.68, 0.32, Math.PI, 0, true);
  shape.lineTo(0.32, 0);
  shape.lineTo(-0.32, 0);
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -0.07);
  // Planar UVs from the extrusion are in shape units; scale them so the stone grain reads.
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) * 1.5, uv.getY(index) * 1.5);
  return geometry;
}
