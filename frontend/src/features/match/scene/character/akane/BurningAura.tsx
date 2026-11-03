"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, type Sprite } from "three";
import { useSoftDisc } from "../shared/softDisc";
import { FlameCard } from "./FlameCard";

/** Flames licking up round the feet, as [angle, width] (aura units: the figure is ~1.9 tall). */
const RING: readonly (readonly [number, number])[] = [
  [0.2, 0.34],
  [0.9, 0.26],
  [1.5, 0.3],
  [2.2, 0.27],
  [2.6, 0.36],
  [3.3, 0.28],
  [3.9, 0.31],
  [4.5, 0.26],
  [5.1, 0.33],
  [5.7, 0.28],
];
const RING_RADIUS = 0.34;
/** Tongues licking up his body, as [angle, height, width]: whoever burns is wrapped in it, not just at the feet. */
const BODY: readonly (readonly [number, number, number])[] = [
  [0.6, 0.5, 0.24],
  [2.4, 0.75, 0.2],
  [4.2, 0.55, 0.22],
  [5.6, 0.95, 0.18],
];

/**
 * Someone on Akane's fire: flames licking round their feet, a hot glow and sparks rising off them. `fierce` is Akane
 * under his own Impetus: a wider, brighter blaze.
 */
export function BurningAura({ fierce = false }: { fierce?: boolean }) {
  const disc = useSoftDisc();
  const glow = useRef<Sprite>(null);
  const ring = useRef<Group>(null);
  const grow = fierce ? 1.35 : 1;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.rotation.y += delta * 0.4;
    if (glow.current) glow.current.material.opacity = (fierce ? 0.6 : 0.5) + Math.sin(t * 6.3) * 0.06;
  });

  return (
    <group>
      <sprite ref={glow} position-y={0.6} scale={[1.8 * grow, 2.4 * grow, 1]}>
        <spriteMaterial
          map={disc}
          color={fierce ? "#ffb347" : "#ff5a1a"}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </sprite>
      <group ref={ring}>
        {RING.map(([angle, width], index) => (
          <FlameCard
            key={index}
            width={width * grow}
            position={[Math.cos(angle) * RING_RADIUS * grow, 0, Math.sin(angle) * RING_RADIUS * grow]}
            seed={index * 2.7}
            glow={fierce ? 1.3 : 1}
          />
        ))}
        {BODY.map(([angle, height, width], index) => (
          <FlameCard
            key={`body${index}`}
            width={width * grow}
            position={[Math.cos(angle) * 0.2, height, Math.sin(angle) * 0.2]}
            seed={index * 4.9 + 1}
            glow={1.2}
          />
        ))}
      </group>
      <Sparkles
        count={fierce ? 26 : 14}
        scale={[0.8 * grow, 1.9, 0.8 * grow]}
        position-y={1}
        size={3}
        speed={1.4}
        color={fierce ? "#ffd27a" : "#ff7a2a"}
      />
    </group>
  );
}

/** Akane's Inner Flame: one fire per flame he holds, circling at his shoulders, big enough to count from afar. */
export function InnerFlames({ count }: { count: number }) {
  const orbit = useRef<Group>(null);
  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.y += delta * 1.1;
  });
  return (
    <group ref={orbit} position-y={1.35}>
      {Array.from({ length: count }, (_, index) => {
        const angle = (index / Math.max(count, 1)) * Math.PI * 2;
        return (
          <FlameCard
            key={index}
            width={0.2}
            position={[Math.cos(angle) * 0.5, Math.sin(angle * 2) * 0.05, Math.sin(angle) * 0.5]}
            seed={index * 5.3}
            glow={1.6}
          />
        );
      })}
    </group>
  );
}
