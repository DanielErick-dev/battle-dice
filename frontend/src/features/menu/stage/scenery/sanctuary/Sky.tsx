"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import { MeshBasicMaterial, type Mesh } from "three";
import { seededRandom } from "@/game/domain/random";
import { useDisposal } from "../kit/dispose";
import { HALF_WIDTH } from "../kit/geometry";
import { useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { clamp } from "../kit/motion";
import { useRefList } from "../kit/refs";

const CLOUDS = 26;
const CLOUD_SPREAD = 0.95;
const RAYS = 5;

/** The sea of clouds round the dais, circling slowly and pushed back by his wingbeats. */
export function CloudSea({ wind }: { wind: RefObject<number> }) {
  const disc = useSoftDisc();
  const [puffs, bind] = useRefList<Mesh>();
  const clouds = useMemo(() => {
    const random = seededRandom(17);
    return Array.from({ length: CLOUDS }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.55 + random() * (CLOUD_SPREAD - 0.55),
      height: -0.16 + random() * 0.1,
      size: 0.35 + random() * 0.35,
      speed: (0.02 + random() * 0.03) * (random() < 0.5 ? 1 : -1),
      tint: random(),
    }));
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const push = 1 + wind.current * 0.3;
    clouds.forEach(({ angle, radius, height, size, speed }, index) => {
      const puff = puffs.current[index];
      if (!puff) return;
      const at = angle + t * speed;
      const x = clamp(Math.cos(at) * radius * push, -HALF_WIDTH + 0.12, HALF_WIDTH - 0.12);
      puff.position.set(x, height + wind.current * 0.04 * Math.sin(t * 20 + index), Math.sin(at) * radius * push);
      // Narrowed at the sides so no puff spills past the stage.
      const width = Math.min(size * (1 + 0.06 * Math.sin(t * 0.4 + index)), 2 * (HALF_WIDTH - Math.abs(x)));
      puff.scale.setScalar(Math.max(0.15, width));
      puff.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <>
      {clouds.map(({ tint }, index) => (
        <mesh key={index} ref={bind(index)} renderOrder={2}>
          <planeGeometry args={[1, 0.55]} />
          <meshBasicMaterial
            map={disc}
            color={tint < 0.3 ? "#fde9b8" : "#f4f1ff"}
            opacity={0.5}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

const BEAMS = Array.from({ length: RAYS }, (_, index) => ({
  x: -0.55 + (index / (RAYS - 1)) * 1.1,
  z: -0.6 - (index % 2) * 0.25,
  tilt: -0.25 + (index / (RAYS - 1)) * 0.5,
  width: 0.12 + (index % 3) * 0.06,
  phase: index * 1.7,
}));

/** Shafts of light slanting down behind him, breathing, flickering while the wind blows. */
export function LightRays({ wind }: { wind: RefObject<number> }) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () => BEAMS.map(() => new MeshBasicMaterial({ map: disc, color: "#fff1c4", opacity: 0.12, ...HOT_GLOW })),
    [disc],
  );
  useDisposal(materials);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    BEAMS.forEach(({ phase }, index) => {
      const flicker = wind.current * 0.12 * Math.sin(t * 47 + phase * 5);
      materials[index].opacity = 0.1 + 0.07 * Math.sin(t * 0.6 + phase) + flicker;
    });
  });

  return (
    <>
      {BEAMS.map(({ x, z, tilt, width }, index) => (
        <mesh key={index} material={materials[index]} position={[x, 0.95, z]} rotation-z={tilt} scale={[width, 2.1, 1]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  );
}
