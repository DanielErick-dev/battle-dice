"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, type Group } from "three";
import { seededRandom } from "@/game/domain/random";
import { grassTuft, scatterAround } from "../kit/geometry";

const TUFTS = 24;

/** Grass flattened towards +X by the wind, rippling as gusts pass through. */
export function WindsweptGrass() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(109);
    const root = new Color("#3d4a24");
    const tip = new Color("#b5d47a");
    const variants = [0, 1, 2].map(() => grassTuft(random, 8, 0.12, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.3, 0.92).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.6 + random() * 0.8,
      turn: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);
  const meshes = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tufts.forEach(({ x }, index) => {
      const tuft = meshes.current[index];
      // The gust travels across the stage, so neighbouring tufts bend one after the other.
      const gust = 0.5 + 0.5 * Math.sin(t * 1.2 - x * 3);
      if (tuft) tuft.rotation.z = -(0.12 + 0.2 * gust + 0.04 * Math.sin(t * 7 + index));
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
