"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { SpriteMaterial, type Sprite } from "three";
import { PIPES } from "./layout";
import { useSoftDisc } from "../kit/matchAssets";

const PUFFS = 7;

const PUFF_LIFE = 2.2;

/** Puffs of steam out of the pipes, coming in spurts. */
export function Steam() {
  const disc = useSoftDisc();
  const material = useMemo(
    () => new SpriteMaterial({ map: disc, color: "#f2ece4", transparent: true, depthWrite: false }),
    [disc],
  );
  useEffect(() => () => material.dispose(), [material]);
  const puffs = useMemo(
    () =>
      PIPES.flatMap((pipe) =>
        Array.from({ length: PUFFS }, (_, index) => ({
          pipe,
          offset: (index / PUFFS) * PUFF_LIFE,
          material: material.clone(),
        })),
      ),
    [material],
  );
  useEffect(() => () => puffs.forEach((puff) => puff.material.dispose()), [puffs]);
  const sprites = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.forEach(({ pipe, offset, material: puffMaterial }, index) => {
      const sprite = sprites.current[index];
      if (!sprite) return;
      const age = (t + offset) % PUFF_LIFE;
      const life = age / PUFF_LIFE;
      // Strong when it left the pipe during a spurt, faint between them.
      const born = t - age;
      const spurt = 0.25 + 0.75 * Math.max(0, Math.sin(born * 0.9 + pipe.phase)) ** 2;
      sprite.position.set(
        pipe.x + Math.sin(life * 3 + index) * 0.03 * life,
        pipe.height + 0.03 + life * 0.45,
        pipe.z + life * 0.05,
      );
      sprite.scale.setScalar(0.06 + life * 0.22);
      puffMaterial.opacity = spurt * 0.35 * Math.min(1, life * 8) * (1 - life);
    });
  });

  return (
    <>
      {puffs.map(({ material: puffMaterial }, index) => (
        <sprite key={index} ref={(sprite) => void (sprites.current[index] = sprite)} material={puffMaterial} />
      ))}
    </>
  );
}
