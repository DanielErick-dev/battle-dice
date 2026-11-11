"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, SpriteMaterial, type Sprite } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { glowColor } from "@/features/characters/shared/glowColor";
import { useDisposables } from "@/features/characters/shared/disposal";
import { useSoftDisc } from "@/features/characters/shared/softDisc";

const FLAME = glowColor("#ffae4a", 2.2);

/** Torch, candle and fire-basket flames: soft glows flickering out of step, bright enough to bloom. */
export function Flames({ flames }: { flames: readonly Vec3[] }) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () =>
      flames.map(
        () =>
          new SpriteMaterial({
            map: disc,
            color: FLAME,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [disc, flames],
  );
  useDisposables(materials);
  const sprites = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    sprites.current.forEach((sprite, index) => {
      if (!sprite) return;
      const flicker = 1 + 0.15 * Math.sin(t * 11 + index * 1.7) + 0.1 * Math.sin(t * 23 + index);
      sprite.scale.setScalar(0.9 * flicker);
      materials[index].opacity = 0.7 + 0.2 * Math.sin(t * 17 + index * 2.3);
    });
  });
  return flames.map((position, index) => (
    <sprite
      key={index}
      ref={(sprite) => {
        sprites.current[index] = sprite;
      }}
      position={position}
      material={materials[index]}
    />
  ));
}
