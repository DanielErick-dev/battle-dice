"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, MeshStandardMaterial, Shape, type Group } from "three";
import { Prop, usePropMesh } from "@/features/match/scene/character/props";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { useNoiseTexture, type NoiseLook } from "./stageTextures";

/** How far the patch of earth reaches round the figure before fading out. */
const EARTH_RADIUS = 0.95;
/** Headstones along the back of the plot: where they stand, how tall, and how they lean (radians). */
const HEADSTONES = [
  { x: -0.66, z: -0.42, height: 0.34, turn: 0.5, lean: -0.12, tilt: 0.05 },
  { x: -0.3, z: -0.72, height: 0.42, turn: 0.15, lean: 0.06, tilt: -0.1 },
  { x: 0.28, z: -0.76, height: 0.38, turn: -0.2, lean: -0.08, tilt: 0.14 },
  { x: 0.68, z: -0.45, height: 0.3, turn: -0.55, lean: 0.15, tilt: -0.06 },
];
/** Low mounds of fresh graves either side of him. */
const MOUNDS = [
  { x: -0.6, z: 0.32, turn: 0.5 },
  { x: 0.62, z: 0.26, turn: -0.45 },
];
/** Patches of dark mist creeping over the ground, and pale wisps drifting above them. */
const SHADOWS = 9;
const WISPS = 6;

/**
 * The Necromancer's stage in place of the rune pedestal: a patch of dark, freshly turned earth
 * with weathered headstones along the back, a crooked wooden cross, two fresh grave mounds and a
 * skull half sunk in the dirt, with shadows creeping over it all. Its origin is on the floor.
 */
export function Graveyard() {
  const soil = useNoiseTexture(SOIL);
  const stone = useNoiseTexture(STONE);
  const skull = usePropMesh("skull");
  const materials = useMemo(
    () => ({
      earth: new MeshStandardMaterial({ map: soil, transparent: true, roughness: 1, depthWrite: false }),
      mound: new MeshStandardMaterial({ map: soil, color: "#8a8279", roughness: 1 }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95 }),
      wood: new MeshStandardMaterial({ color: "#2a2018", roughness: 1 }),
      skull: Object.assign(skull.material.clone(), { color: skull.material.color.clone().multiplyScalar(0.6) }),
    }),
    [soil, stone, skull.material],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const headstone = useHeadstoneGeometry();

  return (
    <group>
      <mesh material={materials.earth} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[EARTH_RADIUS, 64]} />
      </mesh>
      {HEADSTONES.map(({ x, z, height, turn, lean, tilt }) => (
        <group key={`${x}:${z}`} position={[x, -0.03, z]} rotation={[lean, turn, tilt]} scale={height}>
          <mesh geometry={headstone} material={materials.stone} />
        </group>
      ))}
      {/* A crooked wooden cross between the stones. */}
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
          <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
      <group position={[-0.3, 0.02, 0.52]} rotation={[0.35, 0.7, 0.25]}>
        <Prop geometry={skull.geometry} material={materials.skull} height={0.1} />
      </group>
      <CreepingMist />
    </group>
  );
}

/** Dark patches drifting slowly over the ground, and faint pale wisps above them. */
function CreepingMist() {
  const disc = useSoftDisc();
  const patches = useRef<(Group | null)[]>([]);
  const mist = useMemo(
    () =>
      Array.from({ length: SHADOWS + WISPS }, (_, index) => {
        const wisp = index >= SHADOWS;
        return {
          wisp,
          radius: 0.35 + ((index * 0.37) % 0.55),
          angle: index * 2.4,
          speed: (wisp ? 0.07 : 0.04) * (index % 2 ? 1 : -1),
          size: wisp ? 0.5 + (index % 3) * 0.15 : 0.55 + (index % 4) * 0.12,
          height: wisp ? 0.05 + (index % 3) * 0.04 : 0.006 + index * 0.001,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mist.forEach(({ radius, angle, speed, height, size }, index) => {
      const patch = patches.current[index];
      if (!patch) return;
      const at = angle + t * speed;
      patch.position.set(Math.cos(at) * radius, height, Math.sin(at) * radius);
      patch.scale.setScalar(size * (1 + 0.12 * Math.sin(t * 0.5 + index)));
    });
  });

  return (
    <>
      {mist.map(({ wisp }, index) => (
        <group
          key={index}
          ref={(group) => {
            patches.current[index] = group;
          }}
        >
          <mesh rotation-x={-Math.PI / 2} renderOrder={wisp ? 3 : 2}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={disc}
              color={wisp ? "#7d8a78" : "#050605"}
              opacity={wisp ? 0.1 : 0.55}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** A weathered headstone 1 tall standing on its origin and facing +Z: a slab with a rounded top. */
function useHeadstoneGeometry() {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-0.32, 0);
    shape.lineTo(-0.32, 0.68);
    shape.absarc(0, 0.68, 0.32, Math.PI, 0, true);
    shape.lineTo(0.32, 0);
    shape.lineTo(-0.32, 0);
    const result = new ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 16,
    });
    result.translate(0, 0, -0.07);
    // Planar UVs from the extrusion are in shape units; scale them so the stone grain reads.
    const uv = result.getAttribute("uv");
    for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) * 1.5, uv.getY(index) * 1.5);
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

const SOIL: NoiseLook = { base: [34, 27, 21], dark: [12, 10, 8], light: [62, 52, 40], fadeOut: true };
const STONE: NoiseLook = { base: [70, 72, 68], dark: [36, 38, 35], light: [104, 106, 98], fadeOut: false };
