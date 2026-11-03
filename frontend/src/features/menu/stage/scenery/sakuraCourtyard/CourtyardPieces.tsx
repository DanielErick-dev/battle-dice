"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, SpriteMaterial, type Sprite } from "three";
import { useDisposal } from "../kit/dispose";
import { FlameCard, usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { GLOW } from "../kit/materials";

/**
 * Meshy exports come out ±1 on their longest side; where each part's own surfaces sit, in those units (measured).
 * The courtyard's paving lies at COURTYARD_FLOOR; its three little lanterns stand on the rim, fire boxes ~0.15 up.
 */
const COURTYARD_FLOOR = 0.035;
const COURTYARD_LANTERNS: readonly (readonly [number, number])[] = [
  [-0.77, -0.45],
  [0.45, -0.77],
  [0.73, 0.53],
];
const RIM_FIRE_BOX = 0.15;
/** The garden lantern's fire box spans y -0.05 to 0.3 of its ±1 height. */
const LANTERN_FIRE_FOOT = -0.02;
const LANTERN_FIRE_MIDDLE = 0.12;

/** Wide enough for the tree, the notebooks and the lantern to stand on it. */
const COURTYARD_RADIUS = 1.35;
/** The garden lantern at the front left, by the notebooks. */
const LANTERN = { x: -0.88, z: 0.1, height: 0.62 };

const HALO = new Color("#ffad5c");

/** Akane's floor: a stone courtyard ringed by little lanterns, each with a live flame inside. Origin on the floor. */
export function Courtyard() {
  const courtyard = usePropMesh("akaneCourtyard");
  const lift = (y: number) => (y - COURTYARD_FLOOR) * COURTYARD_RADIUS;
  return (
    <group>
      <mesh
        geometry={courtyard.geometry}
        material={courtyard.material}
        scale={COURTYARD_RADIUS}
        position-y={lift(0)}
        receiveShadow
      />
      {COURTYARD_LANTERNS.map(([x, z], index) => (
        <LanternFire
          key={index}
          position={[x * COURTYARD_RADIUS, lift(RIM_FIRE_BOX) - 0.03, z * COURTYARD_RADIUS]}
          width={0.03}
          seed={index * 3.3}
        />
      ))}
    </group>
  );
}

/** The stone garden lantern, a flame burning in its fire box. */
export function StoneLantern() {
  const lantern = usePropMesh("akaneLantern");
  const scale = LANTERN.height / 2;
  return (
    <group position={[LANTERN.x, 0, LANTERN.z]} rotation-y={0.4}>
      <mesh geometry={lantern.geometry} material={lantern.material} scale={scale} position-y={scale} />
      <LanternFire
        position={[0, scale * (1 + LANTERN_FIRE_FOOT), 0]}
        width={0.05}
        seed={2}
        haloY={scale * (LANTERN_FIRE_MIDDLE - LANTERN_FIRE_FOOT)}
      />
    </group>
  );
}

/** A live flame with a warm glow round it; the glow shows through the lantern's stone, as light through paper would. */
function LanternFire({
  position,
  width,
  seed,
  haloY = width,
}: {
  position: [number, number, number];
  width: number;
  seed: number;
  haloY?: number;
}) {
  const disc = useSoftDisc();
  const halo = useRef<Sprite>(null);
  const materials = useMemo(
    () => ({ halo: new SpriteMaterial({ map: disc, color: HALO, opacity: 0.4, ...GLOW, depthTest: false }) }),
    [disc],
  );
  useDisposal(materials);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    halo.current?.scale.setScalar(width * 7 * (1 + 0.12 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23)));
  });
  return (
    <group position={position}>
      <FlameCard width={width} seed={seed} glow={1.3} />
      <sprite ref={halo} material={materials.halo} position-y={haloY} renderOrder={3} />
    </group>
  );
}
