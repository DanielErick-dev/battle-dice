"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import { DoubleSide, MeshBasicMaterial, type Mesh } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { HALF_WIDTH } from "../kit/geometry";
import { useFeatherTexture } from "../kit/matchAssets";
import { fadeAtEnds } from "../kit/motion";
import { useRefList } from "../kit/refs";

const FEATHERS = 14;
const FEATHER_HEIGHT = 2.2;

/** Feathers drifting down round the dais, blown off their path and tumbling while his wings beat. */
export function DriftingFeathers({ wind }: { wind: RefObject<number> }) {
  const texture = useFeatherTexture();
  const [pieces, bind] = useRefList<Mesh>();
  const feathers = useMemo(() => {
    const random = seededRandom(31);
    return Array.from({ length: FEATHERS }, () => ({
      // Round the back and sides, clear of the figure's face.
      x: (random() < 0.5 ? -1 : 1) * (0.3 + random() * (HALF_WIDTH - 0.42)),
      z: -0.9 + random() * 1.1,
      height: random() * FEATHER_HEIGHT,
      speed: 0.06 + random() * 0.06,
      phase: random() * Math.PI * 2,
      size: 0.8 + random() * 0.5,
      /** How far a gust has blown it off its path; eases back as the wind drops. */
      blown: 0,
    }));
  }, []);
  const materials = useMemo(
    () =>
      feathers.map(
        () =>
          new MeshBasicMaterial({
            map: texture,
            color: "#fffaf0",
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
          }),
      ),
    [feathers, texture],
  );
  useDisposal(materials);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const strength = wind.current;
    feathers.forEach((feather, index) => {
      const piece = pieces.current[index];
      if (!piece) return;
      // A strong enough gust lifts them back up.
      feather.height -= feather.speed * delta * (1 - strength * 1.5);
      if (feather.height < 0) feather.height += FEATHER_HEIGHT;
      if (feather.height > FEATHER_HEIGHT) feather.height -= FEATHER_HEIGHT;
      feather.blown += (strength * 0.35 - feather.blown) * Math.min(1, delta * 4);
      const sway = Math.sin(t * 0.9 + feather.phase);
      piece.position.set(
        feather.x + sway * 0.07 + Math.sign(feather.x) * feather.blown,
        feather.height,
        feather.z + Math.cos(t * 0.7 + feather.phase) * 0.04 - feather.blown * 0.5,
      );
      // Rocks like a falling leaf; tumbles in the wind.
      piece.rotation.set(
        0.4 + sway * 0.25 + feather.blown * 8,
        t * 0.5 + feather.phase,
        sway * 0.6 + feather.blown * 5,
      );
      // Faded in at the top and out on the ground.
      materials[index].opacity = 0.9 * fadeAtEnds(feather.height, FEATHER_HEIGHT, 4, 3);
    });
  });

  return (
    <>
      {feathers.map(({ size }, index) => (
        <mesh key={index} ref={bind(index)} material={materials[index]} scale={size}>
          <planeGeometry args={[0.05, 0.13]} />
        </mesh>
      ))}
    </>
  );
}
