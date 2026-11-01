"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  ConeGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SpriteMaterial,
  TubeGeometry,
  type Group,
  type InstancedMesh,
  type Object3D,
} from "three";
import { seededRandom } from "@/game/domain/random";
import { useDisposal } from "../kit/dispose";
import { FallingPetals } from "../kit/FallingPetals";
import { FlickerSprite } from "../kit/FlickerSprite";
import { GroundDisc } from "../kit/Floor";
import { dome } from "../kit/geometry";
import { PROP_HEIGHT, usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { spike, type FlameShape, type Flicker } from "../kit/motion";
import type { Petal } from "../kit/petals";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { useSpin } from "../kit/useSpin";
import { BUSHES, gardenLayout, petalGeometry, roseGeometry, vineCurve, VINES } from "./garden";
import { paintBloodCircle, SOIL } from "./textures";

const CIRCLE_RADIUS = 0.8;
const FLAME = new Color("#ffb066").multiplyScalar(2.1);
const BLOOD_GLOW = "#ff2448";
const CANDELABRA = [
  { x: -0.56, z: -0.64, height: 0.62 },
  { x: 0.58, z: -0.6, height: 0.5 },
];
const CANDLE_FLICKER: Flicker = { slow: [0.12, 13], fast: [0.08, 29] };
const CANDLE_HAZE: FlameShape = { kind: "uniform", size: 0.42 };
const PETALS = 26;
const PETAL_HEIGHT = 1.9;

/**
 * The Crimson Enchantress's stage instead of the rune pedestal: a blood circle painted on dark soil, crimson rose
 * bushes and thorny vines around it, the Meshy candelabra (roseCandelabra) and petals drifting down. Origin on the floor; flames are sprites.
 */
export function BloodRoseGarden() {
  const candelabra = usePropMesh("roseCandelabra");
  const soil = useNoiseTexture(SOIL);
  const circle = useCanvasTexture({ size: 512, draw: paintBloodCircle });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      soil: new MeshStandardMaterial({ map: soil, transparent: true, roughness: 1, depthWrite: false }),
      circle: new MeshBasicMaterial({ map: circle, transparent: true, depthWrite: false }),
      circleGlow: new MeshBasicMaterial({ map: circle, color: BLOOD_GLOW, ...HOT_GLOW }),
      bush: new MeshStandardMaterial({ color: "#0e160c", roughness: 1 }),
      leaf: new MeshStandardMaterial({ color: "#1d2c17", roughness: 0.7, flatShading: true }),
      rose: new MeshStandardMaterial({
        color: "#a0102a",
        roughness: 0.55,
        emissive: "#3d0010",
        emissiveIntensity: 0.6,
        side: DoubleSide,
        flatShading: true,
      }),
      vine: new MeshStandardMaterial({ color: "#24130e", roughness: 0.8 }),
      halo: new SpriteMaterial({ map: disc, color: FLAME, opacity: 0.22, ...HOT_GLOW }),
      petal: new MeshStandardMaterial({ color: "#b3122f", roughness: 0.6, side: DoubleSide }),
    }),
    [soil, circle, disc],
  );
  useDisposal(materials);
  const geometries = useMemo(
    () => ({
      rose: roseGeometry(),
      leaf: new OctahedronGeometry(1, 0),
      thorn: new ConeGeometry(0.005, 0.022, 4).translate(0, 0.011, 0),
      vines: VINES.map((points) => new TubeGeometry(vineCurve(points), 40, 0.007, 5)),
      petal: petalGeometry(),
    }),
    [],
  );
  useDisposal(geometries);
  const layout = useMemo(() => gardenLayout(), []);
  const leaves = useRef<InstancedMesh>(null);
  const roses = useRef<InstancedMesh>(null);
  const thorns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const fill = (mesh: InstancedMesh | null, placements: Object3D[]) => {
      if (!mesh) return;
      placements.forEach((placement, index) => mesh.setMatrixAt(index, placement.matrix));
      mesh.instanceMatrix.needsUpdate = true;
    };
    fill(leaves.current, layout.leaves);
    fill(roses.current, layout.roses);
    fill(thorns.current, layout.thorns);
  }, [layout]);
  const petals = useMemo(() => {
    const random = seededRandom(113);
    return Array.from({ length: PETALS }, (): Petal => {
      const x = (random() - 0.5) * 1.7;
      const z = -0.9 + random() * 1.3;
      const height = random() * PETAL_HEIGHT;
      const speed = 0.08 + random() * 0.08;
      const phase = random() * Math.PI * 2;
      const spin = 0.8 + random() * 1.6;
      return { x, z, height, speed, phase, spin, flutter: { rate: spin, phase: 0 } };
    });
  }, []);
  const ring = useSpin<Group>(0.025);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // A slow heartbeat: two quick throbs, then rest.
    const beat = spike(t, 2.4, 0, 6) + 0.6 * spike(t, 2.4, -0.9, 6);
    materials.circleGlow.setValues({ opacity: 0.12 + 0.35 * beat });
  });

  return (
    <group>
      <GroundDisc material={materials.soil} />
      <group ref={ring} rotation-x={-Math.PI / 2} position-y={0.003}>
        <mesh material={materials.circle}>
          <planeGeometry args={[CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2]} />
        </mesh>
        <mesh material={materials.circleGlow} position-z={0.001}>
          <planeGeometry args={[CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2]} />
        </mesh>
      </group>
      {BUSHES.map(({ x, z, radius }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.bush}
          position={[x, -0.01, z]}
          scale={[radius, radius * 0.75, radius]}
        >
          <sphereGeometry args={dome(14, 8)} />
        </mesh>
      ))}
      <instancedMesh ref={leaves} args={[geometries.leaf, materials.leaf, layout.leaves.length]} />
      <instancedMesh ref={roses} args={[geometries.rose, materials.rose, layout.roses.length]} />
      <instancedMesh ref={thorns} args={[geometries.thorn, materials.vine, layout.thorns.length]} />
      {geometries.vines.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.vine} />
      ))}
      {CANDELABRA.map(({ x, z, height }) => (
        <group key={x} position={[x, 0, z]} rotation-y={x > 0 ? -0.4 : 0.4}>
          <mesh
            geometry={candelabra.geometry}
            material={candelabra.material}
            position-y={height / 2}
            scale={height / PROP_HEIGHT}
          />
          {/* A warm haze round its candles, flickering. */}
          <FlickerSprite
            material={materials.halo}
            look={CANDLE_FLICKER}
            shape={CANDLE_HAZE}
            phases={x > 0 ? [2.1, 1] : [0, 0]}
            position={[0, height * 0.9, 0]}
          />
        </group>
      ))}
      <FallingPetals geometry={geometries.petal} material={materials.petal} petals={petals} top={PETAL_HEIGHT} />
    </group>
  );
}
