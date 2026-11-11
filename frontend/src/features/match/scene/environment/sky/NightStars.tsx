"use client";

import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useRealmMix } from "../../realm/mix/useRealmMix";

/** A few faint stars between the storm clouds, gone when the celestial realm brings daylight. */
export function NightStars({ radius }: { radius: number }) {
  const mix = useRealmMix();
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = mix.current.celestial < 0.35;
  });
  return (
    <group ref={group}>
      <Stars radius={radius} depth={40} count={1000} factor={2.4} saturation={0} fade speed={0.2} />
    </group>
  );
}
