"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Mesh } from "three";
import { useSoftDisc } from "../kit/matchAssets";

const RAYS = 4;

/** Pale shafts of daylight slanting down through the water, swaying slowly. */
export function SunShafts() {
  const disc = useSoftDisc();
  const shafts = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    shafts.current.forEach((shaft, index) => {
      if (!shaft) return;
      shaft.rotation.z = -0.2 + index * 0.13 + 0.04 * Math.sin(t * 0.3 + index * 2);
      (shaft.material as MeshBasicMaterial).opacity = 0.08 + 0.05 * Math.sin(t * 0.5 + index * 1.4);
    });
  });
  return (
    <>
      {Array.from({ length: RAYS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (shafts.current[index] = mesh)}
          position={[-0.5 + index * 0.34, 1.05, -0.7 - (index % 2) * 0.15]}
          scale={[0.16 + (index % 2) * 0.08, 2.2, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#bff7f2"
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}
