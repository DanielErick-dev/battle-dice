"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_HEIGHT, TILE_SIZE } from "@/features/shared/board/boardLayout";

/** Strips of thorny vines laid side by side along the way, covering the whole slab. */
const STRIPS = 4;
const LENGTH = TILE_SIZE * 0.95;
const ACROSS = TILE_SIZE * 1.05;
/** How far the thorns spring up when someone steps in, and how fast they grow and settle back. */
const SPRUNG_SCALE = 2.6;
const GROW_RATE = 14;
const SETTLE_RATE = 3;

/** A trap tile's bed of thorny vines (Meshy): when someone steps in, the thorns shoot up. */
export function TrapSpikes({ sprung, heading }: { sprung: boolean; heading: number }) {
  const vine = useFittedProp("vineTrap");
  const bed = useRef<Group>(null);
  const [width, , depth] = vine.size;
  const scale = LENGTH / width;
  const lift = useRef(1);
  useFrame((_, delta) => {
    const target = sprung ? SPRUNG_SCALE : 1;
    const rate = sprung ? GROW_RATE : SETTLE_RATE;
    lift.current += (target - lift.current) * Math.min(1, delta * rate);
    if (bed.current) bed.current.scale.y = lift.current;
  });
  return (
    <group ref={bed} position-y={TILE_HEIGHT / 2} rotation-y={-heading}>
      {Array.from({ length: STRIPS }, (_, index) => (
        <mesh
          key={index}
          geometry={vine.geometry}
          material={vine.material}
          scale={[scale, scale, ACROSS / STRIPS / depth]}
          position-z={(index - (STRIPS - 1) / 2) * (ACROSS / STRIPS)}
          castShadow
        />
      ))}
    </group>
  );
}
