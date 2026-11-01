"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SpriteMaterial,
  type Group,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture } from "../kit/textures";
import { Flowers } from "./Flowers";
import { FrostTufts } from "./FrostTufts";
import { Sparkles } from "./Sparkles";
import { CLUSTERS, CYAN, LILAC } from "./layout";
import { paintGroveFloor } from "./textures";
import { iceShard, useSoftDisc } from "../kit/matchAssets";

/** Crystal motes hovering over the clusters, slowly turning. */
const FLOATERS = [
  { x: -0.5, y: 1.0, z: -0.5, size: 0.035 },
  { x: 0.48, y: 0.85, z: -0.55, size: 0.028 },
  { x: 0.05, y: 0.7, z: -0.82, size: 0.022 },
];

/**
 * The Crystal Fairy's stage instead of the rune pedestal: an enchanted garden under soft snow, glowing cyan and
 * lilac crystals, a fairy ring of shining flowers, hovering crystal motes and sparkles. Origin on the floor.
 */
export function CrystalGrove() {
  const ground = useCanvasTexture({ size: 512, draw: paintGroveFloor, seed: 79, fadeFrom: 0.45 });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: ground, transparent: true, roughness: 0.85, depthWrite: false }),
      snow: new MeshStandardMaterial({ color: "#eaf8ff", roughness: 0.8 }),
      // Glows from within rather than refracting like Bjorn's glacier ice.
      cyan: new MeshStandardMaterial({
        color: "#8af0ff",
        emissive: CYAN,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      }),
      lilac: new MeshStandardMaterial({
        color: "#d8ccff",
        emissive: LILAC,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      }),
      mote: new MeshBasicMaterial({ color: new Color("#c8fbff").multiplyScalar(1.6), toneMapped: false }),
      cyanGlow: new SpriteMaterial({
        map: disc,
        color: CYAN,
        opacity: 0.3,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      lilacGlow: new SpriteMaterial({
        map: disc,
        color: LILAC,
        opacity: 0.3,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [ground, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const mote = useMemo(() => new OctahedronGeometry(1, 0), []);
  useEffect(() => () => mote.dispose(), [mote]);
  const clusters = useMemo(() => {
    const random = seededRandom(83);
    return CLUSTERS.map((cluster) => ({
      ...cluster,
      shards: Array.from({ length: cluster.shards }, (_, index) => {
        const main = index === 0;
        return {
          geometry: iceShard(random, main ? 0.06 : 0.035 + random() * 0.03, false),
          angle: random() * Math.PI * 2,
          out: main ? 0 : 0.05 + random() * 0.07,
          lean: main ? random() * 0.1 : 0.25 + random() * 0.5,
          height: main ? 1 : 0.35 + random() * 0.5,
          turn: random() * Math.PI,
        };
      }),
    }));
  }, []);
  useEffect(
    () => () => clusters.forEach(({ shards }) => shards.forEach(({ geometry }) => geometry.dispose())),
    [clusters],
  );
  const floaters = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * 0.9);
    materials.cyan.setValues({ emissiveIntensity: 0.55 + 0.2 * pulse });
    materials.lilac.setValues({ emissiveIntensity: 0.55 - 0.2 * pulse });
    materials.cyanGlow.setValues({ opacity: 0.26 + 0.1 * pulse });
    materials.lilacGlow.setValues({ opacity: 0.26 - 0.1 * pulse });
    floaters.current.forEach((floater, index) => {
      if (!floater) return;
      floater.position.y = FLOATERS[index].y + 0.05 * Math.sin(t * 0.8 + index * 2.1);
      floater.rotation.y = t * (0.6 + index * 0.2);
    });
  });

  return (
    <group>
      <mesh material={materials.ground} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {clusters.map(({ x, z, height, shards, violet }) => (
        <group key={`${x}:${z}`} position={[x, -0.01, z]}>
          <group scale={height}>
            {shards.map(({ geometry, angle, out, lean, height: shard, turn }, index) => (
              <group
                key={index}
                position={[Math.cos(angle) * out, 0, Math.sin(angle) * out]}
                rotation={[Math.sin(angle) * lean, 0, -Math.cos(angle) * lean]}
              >
                <mesh
                  geometry={geometry}
                  material={violet ? materials.lilac : materials.cyan}
                  rotation-y={turn}
                  scale={[1, shard, 1]}
                />
              </group>
            ))}
          </group>
          <sprite
            material={violet ? materials.lilacGlow : materials.cyanGlow}
            position-y={height * 0.4}
            scale={[height * 0.9, height * 1.2, 1]}
          />
          <mesh material={materials.snow} position-y={-0.015} scale={[0.17, 0.05, 0.14]}>
            <sphereGeometry args={[1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {FLOATERS.map(({ x, y, z, size }, index) => (
        <group
          key={index}
          ref={(group) => {
            floaters.current[index] = group;
          }}
          position={[x, y, z]}
        >
          <mesh geometry={mote} material={materials.mote} scale={[size * 0.6, size * 1.4, size * 0.6]} />
          <sprite material={materials.cyanGlow} scale={size * 7} />
        </group>
      ))}
      <Flowers />
      <FrostTufts />
      <Sparkles />
    </group>
  );
}
