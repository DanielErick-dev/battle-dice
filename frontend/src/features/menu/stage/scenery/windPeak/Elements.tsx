"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SpriteMaterial,
  type Group,
  type Sprite,
} from "three";
import { useSoftDisc } from "../kit/matchAssets";

/** The four elements circling him, a quarter turn apart. */
const ORBIT = { radius: 0.64, height: 0.55, speed: 0.22 };

/** Air, water, earth and fire: four small tokens slowly circling him, each moving in its own way. */
export function Elements() {
  const disc = useSoftDisc();
  const parts = useMemo(
    () => ({
      air: new MeshBasicMaterial({ color: "#f0fdf4", transparent: true, opacity: 0.35, depthWrite: false }),
      airRing: new MeshBasicMaterial({ color: "#dcfce7", transparent: true, opacity: 0.6, depthWrite: false }),
      water: new MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0c4a6e",
        emissiveIntensity: 0.6,
        roughness: 0.05,
        transparent: true,
        opacity: 0.85,
      }),
      earth: new MeshStandardMaterial({ color: "#7c5a36", roughness: 1, flatShading: true }),
      moss: new MeshStandardMaterial({ color: "#4d7c0f", roughness: 1, flatShading: true }),
      flame: new SpriteMaterial({
        map: disc,
        color: new Color("#ff9d3d").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      core: new SpriteMaterial({
        map: disc,
        color: new Color("#fff2b0").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      halo: [
        ["#ecfdf5", 0.18],
        ["#7dd3fc", 0.2],
        ["#a3e635", 0.12],
        ["#fb923c", 0.28],
      ].map(
        ([color, opacity]) =>
          new SpriteMaterial({
            map: disc,
            color: color as string,
            opacity: opacity as number,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
          }),
      ),
      stone: new DodecahedronGeometry(1, 0),
    }),
    [disc],
  );
  useEffect(
    () => () =>
      Object.values(parts)
        .flat()
        .forEach((part) => part.dispose()),
    [parts],
  );
  const tokens = useRef<(Group | null)[]>([]);
  const spinners = useRef<(Object3D | null)[]>([]);
  const flames = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tokens.current.forEach((token, index) => {
      if (!token) return;
      const at = t * ORBIT.speed + (index * Math.PI) / 2;
      token.position.set(
        Math.cos(at) * ORBIT.radius,
        ORBIT.height + 0.05 * Math.sin(t * 0.9 + index * 1.6),
        Math.sin(at) * ORBIT.radius,
      );
    });
    const [ring, water, earth] = spinners.current;
    if (ring) ring.rotation.set(1.1 + 0.2 * Math.sin(t), t * 3, 0);
    // Water wobbles like a held droplet.
    if (water) water.scale.set(1 + 0.08 * Math.sin(t * 4), 1 - 0.08 * Math.sin(t * 4), 1 + 0.05 * Math.cos(t * 3));
    if (earth) earth.rotation.set(t * 0.4, t * 0.7, 0);
    const [flame, core] = flames.current;
    const flicker = 1 + 0.15 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31);
    flame?.scale.set(0.06 * flicker, 0.09 * (2 - flicker), 1);
    core?.scale.set(0.03 * flicker, 0.04 * flicker, 1);
  });

  const token = (index: number) => (group: Group | null) => {
    tokens.current[index] = group;
  };
  const spinner = (index: number) => (object: Object3D | null) => {
    spinners.current[index] = object;
  };

  return (
    <>
      <group ref={token(0)}>
        <mesh material={parts.air}>
          <sphereGeometry args={[0.03, 16, 12]} />
        </mesh>
        <mesh ref={spinner(0)} material={parts.airRing}>
          <torusGeometry args={[0.045, 0.004, 6, 32]} />
        </mesh>
        <sprite material={parts.halo[0]} scale={0.22} />
      </group>
      <group ref={token(1)}>
        <mesh ref={spinner(1)} material={parts.water}>
          <sphereGeometry args={[0.032, 20, 14]} />
        </mesh>
        <sprite material={parts.halo[1]} scale={0.22} />
      </group>
      <group ref={token(2)}>
        <group ref={spinner(2)}>
          <mesh geometry={parts.stone} material={parts.earth} scale={0.034} />
          <mesh geometry={parts.stone} material={parts.moss} position-y={0.018} scale={[0.024, 0.01, 0.022]} />
        </group>
        <sprite material={parts.halo[2]} scale={0.2} />
      </group>
      <group ref={token(3)}>
        <sprite
          ref={(sprite) => {
            flames.current[0] = sprite;
          }}
          material={parts.flame}
          position-y={0.01}
        />
        <sprite
          ref={(sprite) => {
            flames.current[1] = sprite;
          }}
          material={parts.core}
        />
        <sprite material={parts.halo[3]} scale={0.26} />
      </group>
    </>
  );
}
