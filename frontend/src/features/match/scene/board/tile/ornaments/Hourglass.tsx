"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

const GLASS_HEIGHT = 1.3;

/** A slowly turning RPG hourglass (Meshy) over a lost-turn tile, lit in the tile's colour so it reads at night. */
export function Hourglass({ color }: { color: string }) {
  const glass = useRef<Group>(null);
  const model = useFittedProp("hourglass");
  const material = useMemo(() => {
    const lit = model.material.clone();
    lit.emissive.set(color);
    lit.emissiveIntensity = 0.45;
    return lit;
  }, [model.material, color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    if (!glass.current) return;
    glass.current.rotation.y += delta * 0.6;
    glass.current.position.y = TILE_HEIGHT / 2 + 0.25 + Math.sin(clock.elapsedTime * 1.4) * 0.06;
  });
  return (
    <group>
      <group ref={glass}>
        <mesh geometry={model.geometry} material={material} scale={GLASS_HEIGHT} castShadow />
      </group>
      <Sparkles count={10} scale={[0.9, 1.4, 0.9]} position-y={0.9} size={3} speed={0.5} color={color} />
    </group>
  );
}
