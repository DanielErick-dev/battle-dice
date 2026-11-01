"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Mesh } from "three";
import { seededRandom } from "@/game/domain/random";
import { HALF_WIDTH } from "./layout";
import { useSoftDisc } from "../kit/matchAssets";

const STREAKS = 6;

/** Thin streaks of air racing across behind him, faded in and out at the sides. */
export function WindStreaks() {
  const disc = useSoftDisc();
  const streaks = useRef<(Mesh | null)[]>([]);
  const lines = useMemo(() => {
    const random = seededRandom(127);
    return Array.from({ length: STREAKS }, () => ({
      y: 0.25 + random() * 1.4,
      z: -0.55 - random() * 0.4,
      speed: 0.6 + random() * 0.5,
      offset: random() * 2,
      length: 0.3 + random() * 0.35,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lines.forEach(({ y, z, speed, offset }, index) => {
      const streak = streaks.current[index];
      if (!streak) return;
      // Each crossing then a pause off stage, so they come in irregular gusts.
      const run = ((t * speed + offset) % 3) - 1.5;
      streak.position.set(run * HALF_WIDTH * 1.2, y + 0.03 * Math.sin(run * 4), z);
      const material = streak.material as MeshBasicMaterial;
      material.opacity = 0.22 * Math.max(0, 1 - Math.abs(run) / 1.1);
    });
  });

  return (
    <>
      {lines.map(({ length }, index) => (
        <mesh key={index} ref={(mesh) => void (streaks.current[index] = mesh)} scale={[length, 0.012, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#f0fff4"
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
