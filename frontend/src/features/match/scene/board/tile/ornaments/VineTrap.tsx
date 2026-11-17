"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

/** Strips laid side by side across the walkway (with its kerbs), each this long along the way and this wide. */
const STRIPS = 2;
const STRIP_LENGTH = 1.85;
const STRIP_WIDTH = 0.56;
/** Snapping up when someone steps in, then sinking back slowly. */
const SPRUNG_SCALE = 2.6;
const GROW_RATE = 16;
const SETTLE_RATE = 3;

/** The island's trap: thorny vines (Meshy) along the walkway; they lash up when someone steps in. */
export function VineTrap({ sprung, heading }: { sprung: boolean; heading: number }) {
  const vine = useFittedProp("vineTrap");
  const bed = useRef<Group>(null);
  const lift = useRef(1);
  useFrame((_, delta) => {
    const target = sprung ? SPRUNG_SCALE : 1;
    lift.current += (target - lift.current) * Math.min(1, delta * (sprung ? GROW_RATE : SETTLE_RATE));
    if (bed.current) bed.current.scale.y = lift.current;
  });
  // The model lies along x, as the way does in the tile's turned frame.
  const scale: [number, number, number] = [
    STRIP_LENGTH / vine.size[0],
    STRIP_LENGTH / vine.size[0],
    STRIP_WIDTH / vine.size[2],
  ];
  return (
    <group position-y={TILE_HEIGHT / 2 - 0.04} rotation-y={-heading}>
      <group ref={bed}>
        {Array.from({ length: STRIPS }, (_, index) => (
          <mesh
            key={index}
            geometry={vine.geometry}
            material={vine.material}
            position-z={(index - (STRIPS - 1) / 2) * STRIP_WIDTH * 0.92}
            // Every other strip turned end to end, so the two don't read as copies.
            rotation-y={index % 2 ? Math.PI : 0}
            scale={scale}
            castShadow
          />
        ))}
      </group>
    </group>
  );
}
