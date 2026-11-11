"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { SpriteMaterial, type Sprite } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { useDisposables } from "@/features/characters/shared/disposal";
import { useSoftDisc } from "@/features/characters/shared/softDisc";

const SMOKE_PUFFS = 4;
const SMOKE_RISE = 2.2;
const SMOKE_SECONDS = 4;

/** Dark, thin smoke rising from every chimney (and the wasteland's fires), swelling and thinning as it goes. */
export function ChimneySmoke({ chimneys }: { chimneys: readonly Vec3[] }) {
  const disc = useSoftDisc();
  // One material per puff: each fades on its own.
  const materials = useMemo(
    () =>
      Array.from(
        { length: chimneys.length * SMOKE_PUFFS },
        () => new SpriteMaterial({ map: disc, color: "#4a4850", transparent: true, depthWrite: false, opacity: 0 }),
      ),
    [disc, chimneys.length],
  );
  useDisposables(materials);
  const puffs = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    puffs.current.forEach((puff, index) => {
      const chimney = chimneys[Math.floor(index / SMOKE_PUFFS)];
      const material = materials[index];
      if (!puff || !chimney || !material) return;
      const t = (now / SMOKE_SECONDS + (index % SMOKE_PUFFS) / SMOKE_PUFFS + index * 0.137) % 1;
      puff.position.set(chimney[0] + Math.sin(t * 3 + index) * 0.25 + t * 0.5, chimney[1] + t * SMOKE_RISE, chimney[2]);
      puff.scale.setScalar(0.35 + t * 1.1);
      material.opacity = 0.3 * Math.sin(t * Math.PI);
    });
  });
  return (
    <group>
      {materials.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            puffs.current[index] = sprite;
          }}
          material={material}
        />
      ))}
    </group>
  );
}
