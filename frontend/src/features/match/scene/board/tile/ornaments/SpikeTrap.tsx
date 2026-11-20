"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_HEIGHT } from "@/features/shared/board/boardLayout";

/** How long the pit runs along the walkway; the model's height follows from its proportions. */
const PIT_LENGTH = 1.5;
/** Sunk into the slab by this share of its height: at rest only the stake tips show, sprung they stand clear. */
const REST_SINK = 0.62;
const SPRUNG_SINK = 0.36;
/** Snapping up when someone steps in, then sinking back slowly. */
const RISE_RATE = 18;
const SETTLE_RATE = 2.5;

/** The island's trap (Meshy): a wooden pit of sharpened stakes set into the walkway; they shoot up when someone steps in. */
export function SpikeTrap({ sprung, heading }: { sprung: boolean; heading: number }) {
  const pit = useFittedProp("spikeTrap");
  const body = useRef<Group>(null);
  // The model's long side is its depth (z): its height is set so that side spans PIT_LENGTH.
  const height = PIT_LENGTH / pit.size[2];
  const sink = useRef(REST_SINK);
  useFrame((_, delta) => {
    const target = sprung ? SPRUNG_SINK : REST_SINK;
    sink.current += (target - sink.current) * Math.min(1, delta * (sprung ? RISE_RATE : SETTLE_RATE));
    if (body.current) body.current.position.y = -sink.current * height;
  });
  return (
    // Turned so its long side lies along the way (x in the tile's turned frame).
    <group position-y={TILE_HEIGHT / 2} rotation-y={Math.PI / 2 - heading}>
      <group ref={body}>
        <mesh geometry={pit.geometry} material={pit.material} scale={height} castShadow />
      </group>
    </group>
  );
}
