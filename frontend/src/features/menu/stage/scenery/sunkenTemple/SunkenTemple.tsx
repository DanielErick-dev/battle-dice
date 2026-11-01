"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Mesh,
} from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { Bubbles } from "./Bubbles";
import { Coins } from "./Coins";
import { SeaFan } from "./SeaFan";
import { Seaweed } from "./Seaweed";
import { SunShafts } from "./SunShafts";
import { CAUSTICS, GILT, MASK, TILES } from "./textures";
import { usePropMesh } from "../kit/matchAssets";

/** Coral on its rock (a Meshy prop, 2 tall in its export): how tall each stands and how far it's turned. */
const CORALS = [
  { x: -0.7, z: -0.55, height: 0.75, turn: 0.5 },
  { x: 0.78, z: -0.72, height: 0.6, turn: -0.6 },
  { x: -0.86, z: 0.12, height: 0.32, turn: 1.4 },
];

/** The ruin of rune pillars standing behind him (a Meshy prop, 2 tall in its export). */
const PILLARS = { x: -0.1, z: -1.05, height: 1.7, turn: 0.15 };

/** The open treasure chest the coins spilled from (a Meshy prop, 2 wide and 1.28 tall in its export). */
const CHEST = { x: 0.55, z: -0.38, width: 0.42, turn: -0.5 };

/**
 * Auric's stage instead of the rune pedestal: the gold-inlaid floor of a sunken temple, coral and swaying
 * weed, rune pillars, an open treasure chest and its coins, caustics rippling over the seabed and bubbles rising. Origin on the floor.
 */
export function SunkenTemple() {
  const tiles = useCanvasTexture(TILES);
  const causticsA = useCanvasTexture(CAUSTICS);
  const causticsB = useCanvasTexture(CAUSTICS);
  const mask = useCanvasTexture(MASK);
  const gilt = useNoiseTexture(GILT);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.75, depthWrite: false }),
      gold: new MeshStandardMaterial({
        map: gilt,
        metalness: 0.85,
        roughness: 0.35,
        emissive: "#5c3d08",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      weed: new MeshStandardMaterial({ color: "#2f7d4f", roughness: 0.8, side: DoubleSide }),
      darkWeed: new MeshStandardMaterial({ color: "#1d5a44", roughness: 0.8, side: DoubleSide }),
      brain: new MeshStandardMaterial({ color: "#d9a066", roughness: 0.9 }),
      caustics: [causticsA, causticsB].map(
        (map) =>
          new MeshBasicMaterial({
            map,
            alphaMap: mask,
            color: "#7fe9f5",
            opacity: 0.55,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    }),
    [tiles, gilt, causticsA, causticsB, mask],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const coral = usePropMesh("auricCoral");
  const pillars = usePropMesh("auricPillars");
  const chest = usePropMesh("auricChest");
  const brain = useMemo(() => brainCoral(), []);
  useEffect(() => () => brain.dispose(), [brain]);

  const caustics = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Two layers drifting across each other make the net of light shift and break.
    causticsA.repeat.set(1.6, 1.6);
    causticsA.offset.set(t * 0.018, t * 0.011);
    causticsB.repeat.set(2.1, 2.1);
    causticsB.offset.set(-t * 0.013, t * 0.02);
    const pulse = caustics.current[0];
    if (pulse) (pulse.material as MeshBasicMaterial).opacity = 0.45 + 0.15 * Math.sin(t * 0.7);
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {materials.caustics.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (caustics.current[index] = mesh)}
          material={material}
          rotation-x={-Math.PI / 2}
          position-y={0.004 + index * 0.001}
          renderOrder={1}
        >
          <circleGeometry args={[GROUND_RADIUS * 0.95, 64]} />
        </mesh>
      ))}
      <mesh
        geometry={pillars.geometry}
        material={pillars.material}
        scale={PILLARS.height / 2}
        position={[PILLARS.x, PILLARS.height / 2, PILLARS.z]}
        rotation-y={PILLARS.turn}
      />
      <mesh
        geometry={chest.geometry}
        material={chest.material}
        scale={CHEST.width / 2}
        position={[CHEST.x, (CHEST.width / 2) * 0.64, CHEST.z]}
        rotation-y={CHEST.turn}
      />
      {CORALS.map(({ x, z, height, turn }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={coral.geometry}
          material={coral.material}
          scale={height / 2}
          position={[x, height / 2, z]}
          rotation-y={turn}
        />
      ))}
      <mesh geometry={brain} material={materials.brain} position={[-0.48, -0.02, -0.3]} scale={[0.08, 0.055, 0.07]} />
      <mesh geometry={brain} material={materials.brain} position={[0.86, -0.02, 0.06]} scale={[0.06, 0.04, 0.055]} />
      <SeaFan />
      <Seaweed weed={materials.weed} darkWeed={materials.darkWeed} />
      <Coins gold={materials.gold} />
      <Bubbles />
      <SunShafts />
    </group>
  );
}

/** A dome 1 across, its surface folded into ridges. */
function brainCoral(): BufferGeometry {
  const geometry = new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    const ridge = 1 + 0.05 * Math.sin(point.x * 14 + Math.sin(point.z * 9) * 2) * Math.cos(point.z * 12);
    point.multiplyScalar(ridge);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
