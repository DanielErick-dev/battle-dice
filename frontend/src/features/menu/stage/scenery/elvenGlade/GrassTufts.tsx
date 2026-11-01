"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, type Group } from "three";
import { seededRandom } from "@/game/domain/random";
import { grassTuft, scatterAround } from "../kit/geometry";

const TUFTS = 18;

export function GrassTufts() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(67);
    const root = new Color("#1f3310");
    const tip = new Color("#8fbf3a");
    const variants = [0, 1, 2].map(() => grassTuft(random, 9, 0.13, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.32, 0.92).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.7 + random() * 0.7,
      turn: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);
  const meshes = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tufts.forEach(({ phase }, index) => {
      const tuft = meshes.current[index];
      if (tuft) tuft.rotation.z = 0.06 * Math.sin(t * 1.1 + phase);
    });
  });

  return (
    <>
      {tufts.map(({ x, z, variant, size, turn }, index) => (
        <group
          key={index}
          ref={(group) => {
            meshes.current[index] = group;
          }}
          position={[x, 0, z]}
        >
          <mesh geometry={variants[variant]} rotation-y={turn} scale={size}>
            <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}
