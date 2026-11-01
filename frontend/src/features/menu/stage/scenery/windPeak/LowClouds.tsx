"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MeshBasicMaterial, type Mesh } from "three";
import { seededRandom } from "@/game/domain/random";
import { HALF_WIDTH } from "./layout";
import { useSoftDisc } from "../kit/matchAssets";

const CLOUDS = 7;

/** Cloud tops just below the summit's rim, drifting with the wind: the peak is high. */
export function LowClouds() {
  const disc = useSoftDisc();
  const puffs = useRef<(Mesh | null)[]>([]);
  const clouds = useMemo(() => {
    const random = seededRandom(131);
    return Array.from({ length: CLOUDS }, () => ({
      x: (random() - 0.5) * 2 * HALF_WIDTH,
      z: -0.75 - random() * 0.3,
      y: -0.12 + random() * 0.08,
      size: 0.4 + random() * 0.3,
      speed: 0.03 + random() * 0.03,
    }));
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    clouds.forEach(({ x, y, z, size, speed }, index) => {
      const puff = puffs.current[index];
      if (!puff) return;
      const span = 2 * HALF_WIDTH;
      const at = ((x + t * speed + HALF_WIDTH) % span) - HALF_WIDTH;
      puff.position.set(at, y, z);
      // Narrowed and faded at the sides so no puff spills past the stage.
      puff.scale.setScalar(Math.max(0.1, Math.min(size, 2 * (HALF_WIDTH - Math.abs(at)))));
      (puff.material as MeshBasicMaterial).opacity = 0.4 * Math.min(1, (HALF_WIDTH - Math.abs(at)) * 4);
      puff.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <>
      {clouds.map((_, index) => (
        <mesh key={index} ref={(mesh) => void (puffs.current[index] = mesh)} renderOrder={-2}>
          <planeGeometry args={[1, 0.5]} />
          <meshBasicMaterial map={disc} color="#f1f5f9" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
