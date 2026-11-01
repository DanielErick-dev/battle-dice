"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, ExtrudeGeometry, MeshStandardMaterial, Path, Shape, type Group } from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { ClockRing } from "./ClockRing";
import { Steam } from "./Steam";
import { MODULE, PIPES, TOOTH_DEPTH } from "./layout";
import { NUMERALS, PLATES, WEAR } from "./textures";
import { usePropMesh } from "../kit/matchAssets";

const GEAR_THICKNESS = 0.03;

/** Turn rate of the gear under the figure, in radians a second; the rest follow from their teeth. */
const DRIVE_SPEED = 0.16;

/** Gears set in the floor: the drive under the figure and two meshing with it, `angle` round from its +x. */
const FLOOR_GEARS = [
  { teeth: 20, angle: 0, spokes: 6 },
  { teeth: 12, angle: (140 * Math.PI) / 180, spokes: 4 },
  { teeth: 14, angle: (38 * Math.PI) / 180, spokes: 5 },
];

/** Loose cogs dropped on the floor at the sides. */
const LOOSE_COGS = [
  { x: -0.74, z: 0.22, teeth: 7, turn: 0.4, tilt: 0.08 },
  { x: 0.76, z: 0.16, teeth: 9, turn: 1.1, tilt: -0.1 },
  { x: -0.62, z: 0.46, teeth: 5, turn: 2.3, tilt: 0.25 },
];

/** A brass armillary sphere on its stand at his left (a Meshy prop, 2 tall in its export). */
const GLOBE = { x: -0.6, z: -0.2, height: 0.6, turn: 0.6 };

const GLOW = new Color("#ffb347").multiplyScalar(1.8);

/**
 * Cronos's stage instead of the rune pedestal: a riveted bronze floor with gears set into it turning in mesh,
 * a great ring of numerals behind whose hands now and then run backwards, cogs, and pipes puffing steam.
 * Origin on the floor.
 */
export function GearWorks() {
  const globe = usePropMesh("cronosGlobe");
  const plates = useCanvasTexture(PLATES);
  const numerals = useCanvasTexture(NUMERALS);
  const wear = useNoiseTexture(WEAR);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({
        map: plates,
        transparent: true,
        roughness: 0.6,
        metalness: 0.5,
        depthWrite: false,
      }),
      bronze: new MeshStandardMaterial({ map: wear, color: "#c98a46", metalness: 0.85, roughness: 0.38 }),
      brass: new MeshStandardMaterial({ map: wear, color: "#e0b85a", metalness: 0.9, roughness: 0.3 }),
      iron: new MeshStandardMaterial({ color: "#2a2420", metalness: 0.7, roughness: 0.55 }),
      dial: new MeshStandardMaterial({
        map: numerals,
        emissiveMap: numerals,
        emissive: "#ffae42",
        emissiveIntensity: 0.6,
        metalness: 0.6,
        roughness: 0.45,
      }),
      glow: new MeshStandardMaterial({
        color: "#000000",
        emissive: GLOW,
        toneMapped: false,
        transparent: true,
        opacity: 0.6,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [plates, numerals, wear],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const gears = useMemo(() => {
    const shapes = new Map<string, ExtrudeGeometry>();
    const gear = (teeth: number, spokes: number) => {
      const key = `${teeth}:${spokes}`;
      if (!shapes.has(key)) shapes.set(key, gearGeometry(teeth, spokes));
      return shapes.get(key)!;
    };
    return { gear, all: shapes };
  }, []);
  useEffect(() => () => gears.all.forEach((geometry) => geometry.dispose()), [gears]);
  const layout = useMemo(() => {
    const [drive] = FLOOR_GEARS;
    return FLOOR_GEARS.map(({ teeth, angle, spokes }, index) => {
      if (index === 0) return { x: 0, z: 0, teeth, spokes, ratio: 1, phase: 0 };
      const distance = (drive.teeth + teeth) * MODULE - TOOTH_DEPTH;
      // Starts with a gap of its own facing a tooth of the drive, so the two never clip.
      const phase = (drive.teeth * angle + teeth * (angle + Math.PI) - Math.PI) / teeth;
      return {
        x: Math.cos(angle) * distance,
        z: -Math.sin(angle) * distance,
        teeth,
        spokes,
        ratio: -drive.teeth / teeth,
        phase,
      };
    });
  }, []);
  const spinning = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const turn = clock.elapsedTime * DRIVE_SPEED;
    layout.forEach(({ ratio, phase }, index) => {
      const gear = spinning.current[index];
      if (gear) gear.rotation.y = ratio * turn + phase;
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {layout.map(({ x, z, teeth, spokes }, index) => (
        <group key={index} position={[x, 0, z]}>
          {/* The pit it turns in, dark through its spoke windows. */}
          <mesh material={materials.iron} rotation-x={-Math.PI / 2} position-y={0.002}>
            <circleGeometry args={[teeth * MODULE + 0.012, 40]} />
          </mesh>
          <group ref={(group) => void (spinning.current[index] = group)} position-y={0.012 - GEAR_THICKNESS}>
            <mesh geometry={gears.gear(teeth, spokes)} material={index === 0 ? materials.bronze : materials.brass} />
          </group>
        </group>
      ))}
      {LOOSE_COGS.map(({ x, z, teeth, turn, tilt }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation={[tilt, turn, 0]} scale={[1, 0.5, 1]}>
          <mesh geometry={gears.gear(teeth, 0)} material={materials.brass} />
        </group>
      ))}
      <ClockRing materials={materials} gear={gears.gear} />
      <mesh
        geometry={globe.geometry}
        material={globe.material}
        scale={GLOBE.height / 2}
        position={[GLOBE.x, GLOBE.height / 2, GLOBE.z]}
        rotation-y={GLOBE.turn}
      />
      {PIPES.map(({ x, z, height }) => (
        <group key={x} position={[x, 0, z]}>
          <mesh material={materials.iron} position-y={0.02}>
            <cylinderGeometry args={[0.06, 0.07, 0.04, 16]} />
          </mesh>
          <mesh material={materials.bronze} position-y={height / 2}>
            <cylinderGeometry args={[0.03, 0.03, height, 14]} />
          </mesh>
          {[0.3, 0.7].map((at) => (
            <mesh key={at} material={materials.brass} position-y={height * at}>
              <cylinderGeometry args={[0.038, 0.038, 0.02, 14]} />
            </mesh>
          ))}
          <mesh material={materials.brass} position-y={height + 0.015}>
            <cylinderGeometry args={[0.042, 0.032, 0.03, 14]} />
          </mesh>
        </group>
      ))}
      <Steam />
    </group>
  );
}

/** A flat spur gear lying on its face, its top at y = GEAR_THICKNESS: trapezoid teeth, a hub, spoke windows. */
function gearGeometry(teeth: number, spokes: number): ExtrudeGeometry {
  const outer = teeth * MODULE;
  const root = outer - TOOTH_DEPTH;
  const pitch = (Math.PI * 2) / teeth;
  const shape = new Shape();
  for (let tooth = 0; tooth < teeth; tooth++) {
    const at = tooth * pitch;
    const corners = [
      [root, at - pitch * 0.3],
      [outer, at - pitch * 0.17],
      [outer, at + pitch * 0.17],
      [root, at + pitch * 0.3],
    ];
    corners.forEach(([radius, angle], corner) => {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (tooth === 0 && corner === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hub = new Path();
  hub.absarc(0, 0, Math.max(0.012, outer * 0.12), 0, Math.PI * 2, true);
  shape.holes.push(hub);
  if (spokes > 0) {
    const from = outer * 0.3;
    const to = root * 0.78;
    const spoke = 0.32 / spokes;
    for (let window = 0; window < spokes; window++) {
      const start = (window / spokes) * Math.PI * 2 + spoke;
      const end = ((window + 1) / spokes) * Math.PI * 2 - spoke;
      const hole = new Path();
      hole.absarc(0, 0, to, start, end, false);
      hole.absarc(0, 0, from, end, start, true);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: GEAR_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 1,
    curveSegments: 10,
  });
  // Laid flat: the shape's plane becomes the floor, its angles turning the same way as rotation.y.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.004, 0);
  return geometry;
}
