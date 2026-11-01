"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  type Group,
  type Sprite,
} from "three";
import { ABOVE_FLOOR, GROUND_RADIUS, taperedTube } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { Blossoms } from "./Blossoms";
import { FallingPetals } from "./FallingPetals";
import { Notebook } from "./Notebook";
import { NOTEBOOK_SIZE } from "./layout";
import { BARK, paintCourtyardFloor, paintNotebookPage, STONE } from "./textures";
import { useSoftDisc } from "../kit/matchAssets";

/** Thick end first. The trunk rises at the back left; the boughs reach over the figure's head. */
const TRUNK: [number, number, number][] = [
  [-0.8, -0.05, -0.64],
  [-0.75, 0.4, -0.62],
  [-0.64, 0.85, -0.56],
  [-0.48, 1.22, -0.5],
];

const BOUGHS: { points: [number, number, number][]; radius: number }[] = [
  {
    points: [
      [-0.7, 0.68, -0.6],
      [-0.4, 0.92, -0.7],
      [-0.05, 1.08, -0.76],
      [0.22, 1.12, -0.7],
    ],
    radius: 0.034,
  },
  {
    points: [
      [-0.62, 0.9, -0.56],
      [-0.88, 1.18, -0.42],
      [-1.05, 1.32, -0.2],
    ],
    radius: 0.03,
  },
  {
    points: [
      [-0.5, 1.18, -0.5],
      [-0.22, 1.42, -0.46],
      [0.12, 1.5, -0.56],
    ],
    radius: 0.026,
  },
  {
    points: [
      [-0.76, 0.48, -0.62],
      [-0.98, 0.62, -0.78],
      [-1.12, 0.7, -0.94],
    ],
    radius: 0.022,
  },
];

const LANTERN = { x: 0.66, z: -0.6 };

const CANDLE = new Color("#ffc27a").multiplyScalar(2.2);

/** Akane's stage: a stone courtyard at dusk under a cherry tree shedding petals, notebooks and a stone lantern. */
export function SakuraCourtyard() {
  const paving = useCanvasTexture({ size: 512, draw: paintCourtyardFloor, seed: 29, fadeFrom: 0.3 });
  const bark = useNoiseTexture(BARK);
  const stone = useNoiseTexture(STONE);
  const page = useCanvasTexture({ size: 128, draw: paintNotebookPage, seed: 7 });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: paving, transparent: true, roughness: 0.95, depthWrite: false }),
      bark: new MeshStandardMaterial({ map: bark, color: "#6e5a52", roughness: 1, clippingPlanes: ABOVE_FLOOR }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
      window: new MeshBasicMaterial({ color: CANDLE, toneMapped: false }),
      page: new MeshStandardMaterial({ map: page, roughness: 0.9, side: DoubleSide }),
      paper: new MeshStandardMaterial({ color: "#efe9dc", roughness: 0.9 }),
      covers: ["#f4a6c6", "#9cc3e8", "#c7b3e6"].map((color) => new MeshStandardMaterial({ color, roughness: 0.7 })),
      pencil: new MeshStandardMaterial({ color: "#f2c14e", roughness: 0.6 }),
      lead: new MeshStandardMaterial({ color: "#d9b38c", roughness: 0.8 }),
      halo: new SpriteMaterial({
        map: disc,
        color: new Color("#ffad5c"),
        opacity: 0.35,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [paving, bark, stone, page, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const wood = useMemo(
    () => [taperedTube(TRUNK, 0.08, 0.55, 28), ...BOUGHS.map(({ points, radius }) => taperedTube(points, radius, 0.8))],
    [],
  );
  useEffect(() => () => wood.forEach((geometry) => geometry.dispose()), [wood]);
  const crown = useRef<Group>(null);
  const flame = useRef<Sprite>(null);
  const leaf = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (crown.current) {
      crown.current.rotation.z = Math.sin(t * 0.6) * 0.012;
      crown.current.rotation.x = Math.sin(t * 0.45 + 1) * 0.008;
    }
    if (flame.current) flame.current.scale.setScalar(0.32 * (1 + 0.1 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23)));
    // A page lifting in the evening breeze and settling back.
    if (leaf.current) leaf.current.rotation.z = 0.04 + 0.6 * Math.max(0, Math.sin(t * 0.7)) ** 3;
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh geometry={wood[0]} material={materials.bark} />
      {/* The boughs sway about the trunk's foot; the trunk stays put. */}
      <group position={TRUNK[0]}>
        <group ref={crown}>
          <group position={[-TRUNK[0][0], -TRUNK[0][1], -TRUNK[0][2]]}>
            {wood.slice(1).map((geometry, index) => (
              <mesh key={index} geometry={geometry} material={materials.bark} />
            ))}
            <Blossoms />
          </group>
        </group>
      </group>
      <FallingPetals />
      <group position={[LANTERN.x, 0, LANTERN.z]} rotation-y={0.4}>
        <mesh material={materials.stone} position-y={0.025}>
          <cylinderGeometry args={[0.085, 0.1, 0.05, 6]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.16}>
          <cylinderGeometry args={[0.032, 0.04, 0.22, 8]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.29}>
          <cylinderGeometry args={[0.095, 0.075, 0.04, 6]} />
        </mesh>
        {/* The light box: the glow shows between four stone corner posts. */}
        <mesh material={materials.window} position-y={0.36}>
          <boxGeometry args={[0.08, 0.085, 0.08]} />
        </mesh>
        {[-1, 1].flatMap((sideX) =>
          [-1, 1].map((sideZ) => (
            <mesh key={`${sideX}:${sideZ}`} material={materials.stone} position={[sideX * 0.045, 0.36, sideZ * 0.045]}>
              <boxGeometry args={[0.024, 0.1, 0.024]} />
            </mesh>
          )),
        )}
        <mesh material={materials.stone} position-y={0.44}>
          <coneGeometry args={[0.15, 0.08, 6]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.495}>
          <sphereGeometry args={[0.024, 10, 8]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.528}>
          <coneGeometry args={[0.014, 0.03, 8]} />
        </mesh>
        <sprite ref={flame} material={materials.halo} position-y={0.36} />
      </group>
      {/* An open notebook, one page lifting. */}
      <group position={[0.44, 0, 0.3]} rotation-y={-0.5}>
        <mesh material={materials.covers[0]} position-y={0.004}>
          <boxGeometry args={[NOTEBOOK_SIZE[0] * 2 + 0.01, 0.008, NOTEBOOK_SIZE[1] + 0.01]} />
        </mesh>
        <mesh material={materials.page} position={[-NOTEBOOK_SIZE[0] / 2, 0.011, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
        <group ref={leaf} position-y={0.012}>
          <mesh material={materials.page} position-x={NOTEBOOK_SIZE[0] / 2} rotation-x={-Math.PI / 2}>
            <planeGeometry args={NOTEBOOK_SIZE} />
          </mesh>
        </group>
        <group position={[0.02, 0.008, 0.13]} rotation={[0, 0.3, Math.PI / 2]}>
          <mesh material={materials.pencil}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
          </mesh>
          <mesh material={materials.lead} position-y={0.08}>
            <coneGeometry args={[0.006, 0.02, 6]} />
          </mesh>
        </group>
      </group>
      {/* Two closed notebooks in a pile, and a loose page. */}
      <group position={[-0.5, 0, 0.36]} rotation-y={0.7}>
        <Notebook cover={materials.covers[1]} paper={materials.paper} level={0} />
        <Notebook cover={materials.covers[2]} paper={materials.paper} level={1} />
      </group>
      <group position={[0.36, 0, -0.42]} rotation-y={2.6}>
        <mesh material={materials.page} position-y={0.004} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
      </group>
    </group>
  );
}
