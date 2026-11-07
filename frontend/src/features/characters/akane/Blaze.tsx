"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { AdditiveBlending, Vector3, type Group, type Mesh, type MeshBasicMaterial, type Sprite } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { useAge } from "@/features/shared/three/useAge";
import { CHEST_HEIGHT, EFFECT_SCALE } from "../core/figure";
import { useSoftDisc } from "../shared/softDisc";
import { FIRE_BOLT_SECONDS } from "@/features/shared/config";
import { FlameCard } from "./FlameCard";

const CORE = "#fff1c2";
const FIRE = "#ff6a1a";
const DEEP = "#ff3a0a";

export const BOLT_FLIGHT = FIRE_BOLT_SECONDS;
/** Into his strike clip, when his hands hit the ground. */
export const STRIKE_IMPACT = 1.05;
const BOLT_ARC = 1.2;
const TRAIL = 9;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** A fireball thrown in an arc from one figure's chest to another's, bursting into flames round them. */
export function FireBolt({
  from,
  to,
  delay = 0,
  ground = false,
}: {
  from: Vec3;
  to: Vec3;
  delay?: number;
  /** Comes down on the tile itself rather than at someone's chest. */
  ground?: boolean;
}) {
  // Positions at the throw: the target may be pushed away right after.
  const [ends] = useState(() => ({
    start: new Vector3(from[0], from[1] + CHEST_HEIGHT, from[2]),
    end: new Vector3(to[0], to[1] + (ground ? 0.25 : CHEST_HEIGHT * 0.7), to[2]),
  }));
  const disc = useSoftDisc();
  const ball = useRef<Group>(null);
  const trail = useRef<(Sprite | null)[]>([]);
  const history = useRef<Vector3[]>([]);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = (age(clock.elapsedTime) - delay) / BOLT_FLIGHT;
    const node = ball.current;
    if (!node) return;
    node.visible = t > 0 && t < 1;
    if (t <= 0) return;
    const k = clamp01(t);
    node.position.lerpVectors(ends.start, ends.end, k);
    node.position.y += Math.sin(k * Math.PI) * BOLT_ARC;
    node.scale.setScalar(EFFECT_SCALE * (0.8 + 0.15 * Math.sin(clock.elapsedTime * 37)));
    history.current.unshift(node.position.clone());
    history.current.length = Math.min(history.current.length, TRAIL);
    trail.current.forEach((sprite, index) => {
      const at = history.current[index + 1];
      if (!sprite) return;
      sprite.visible = !!at && t < 1.25;
      if (at) sprite.position.copy(at);
      sprite.material.opacity = (1 - index / TRAIL) * 0.55 * (1 - clamp01((t - 1) * 4));
    });
  });

  return (
    <group>
      <group ref={ball} visible={false}>
        <sprite scale={1}>
          <spriteMaterial map={disc} color={FIRE} transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
        <sprite scale={0.4}>
          <spriteMaterial map={disc} color={CORE} transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
        <FlameCard width={0.36} position={[0, -0.14, 0]} glow={1.4} seed={from[0]} />
      </group>
      {Array.from({ length: TRAIL }, (_, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            trail.current[index] = sprite;
          }}
          visible={false}
          scale={EFFECT_SCALE * (0.7 - index * 0.06)}
        >
          <spriteMaterial
            map={disc}
            color={index < 2 ? CORE : DEEP}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>
      ))}
      <group position={[to[0], to[1], to[2]]}>
        <FireRing delay={delay + BOLT_FLIGHT} reach={0.9} flames={7} />
      </group>
    </group>
  );
}

/**
 * Flames bursting out of the ground and racing outward in a ring, with a flash at the middle; `reach` is the ring's
 * final radius in effect units (the figure is ~1.9 tall). Foot at the origin.
 */
export function FireRing({
  delay = 0,
  reach = 1.6,
  flames = 12,
  seconds = 0.8,
}: {
  delay?: number;
  reach?: number;
  flames?: number;
  seconds?: number;
}) {
  const disc = useSoftDisc();
  const root = useRef<Group>(null);
  const spokes = useRef<(Group | null)[]>([]);
  const flash = useRef<Sprite>(null);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = (age(clock.elapsedTime) - delay) / seconds;
    if (!root.current) return;
    root.current.visible = t > 0 && t < 1;
    if (t <= 0 || t >= 1) return;
    const radius = 0.15 + easeOut(t) * reach;
    const height = Math.sin(Math.min(1, t * 1.6) * Math.PI) ** 0.6;
    spokes.current.forEach((spoke, index) => {
      if (!spoke) return;
      const angle = (index / flames) * Math.PI * 2;
      spoke.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      spoke.scale.setScalar(Math.max(0.001, height));
    });
    if (flash.current) {
      flash.current.scale.setScalar(0.6 + reach * 2.4 * easeOut(t));
      flash.current.material.opacity = 0.8 * (1 - t);
    }
  });

  return (
    <group ref={root} scale={EFFECT_SCALE} visible={false}>
      <sprite ref={flash} position-y={0.3}>
        <spriteMaterial map={disc} color={FIRE} transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      {Array.from({ length: flames }, (_, index) => (
        <group
          key={index}
          ref={(spoke) => {
            spokes.current[index] = spoke;
          }}
        >
          <FlameCard width={0.34 + (index % 3) * 0.06} seed={index * 2.3} glow={1.4} />
        </group>
      ))}
    </group>
  );
}

/** A column of fire roaring up round the figure and dying back down; foot at the origin. */
export function FlamePillar({
  delay = 0,
  seconds = 1.2,
  size = 1,
}: {
  delay?: number;
  seconds?: number;
  size?: number;
}) {
  const disc = useSoftDisc();
  const root = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = (age(clock.elapsedTime) - delay) / seconds;
    if (!root.current) return;
    root.current.visible = t > 0 && t < 1;
    if (t <= 0 || t >= 1) return;
    const rise = easeOut(Math.min(1, t * 3)) * (1 - clamp01((t - 0.6) / 0.4));
    root.current.scale.set(EFFECT_SCALE * size, EFFECT_SCALE * size * Math.max(0.001, rise) * 1.8, EFFECT_SCALE * size);
    if (glow.current) glow.current.material.opacity = 0.7 * rise;
  });

  return (
    <group ref={root} visible={false}>
      <sprite ref={glow} position-y={0.6} scale={[1.8, 2.6, 1]}>
        <spriteMaterial map={disc} color={FIRE} transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      {[0, 1.3, 2.6, 3.9, 5.2].map((angle, index) => (
        <FlameCard
          key={index}
          width={0.55 - (index % 2) * 0.1}
          position={[Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22]}
          seed={index * 4.1}
          glow={1.5}
        />
      ))}
      <FlameCard width={0.75} seed={9} glow={1.6} />
    </group>
  );
}

const DRAW_IN = 0.8;

/**
 * Scarlet Supernova: every fire on the board streams back into Akane as embers, then he explodes in a blinding sphere,
 * a ring of flames sweeping out across the board and a pillar of fire on him.
 */
export function Supernova({ at, sources }: { at: Vec3; sources: readonly Vec3[] }) {
  const disc = useSoftDisc();
  const [ends] = useState(() => ({
    centre: new Vector3(at[0], at[1] + CHEST_HEIGHT, at[2]),
    from: sources.map(([x, y, z]) => new Vector3(x, y + 0.3, z)),
  }));
  const embers = useRef<(Sprite | null)[]>([]);
  const sphere = useRef<Mesh>(null);
  const sphereMaterial = useRef<MeshBasicMaterial>(null);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    embers.current.forEach((sprite, index) => {
      const start = ends.from[Math.floor(index / 3)];
      if (!sprite || !start) return;
      const k = clamp01((t - (index % 3) * 0.12) / (DRAW_IN - 0.24));
      sprite.visible = k > 0 && k < 1;
      sprite.position.lerpVectors(start, ends.centre, k * k);
      sprite.position.y += Math.sin(k * Math.PI) * 1.5;
    });
    const burst = (t - DRAW_IN) / 1;
    if (sphere.current && sphereMaterial.current) {
      sphere.current.visible = burst > 0 && burst < 1;
      sphere.current.scale.setScalar(0.3 + easeOut(clamp01(burst)) * 5);
      sphereMaterial.current.opacity = 0.75 * (1 - clamp01(burst)) ** 1.5;
    }
  });

  return (
    <group>
      {ends.from.flatMap((_, tile) =>
        [0, 1, 2].map((wave) => (
          <sprite
            key={`${tile}-${wave}`}
            ref={(sprite) => {
              embers.current[tile * 3 + wave] = sprite;
            }}
            visible={false}
            scale={EFFECT_SCALE * (wave === 0 ? 0.9 : 0.55)}
          >
            <spriteMaterial
              map={disc}
              color={wave === 0 ? CORE : FIRE}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </sprite>
        )),
      )}
      <mesh ref={sphere} position={ends.centre} visible={false}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial
          ref={sphereMaterial}
          color={FIRE}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <group position={[at[0], at[1], at[2]]}>
        <FlamePillar delay={DRAW_IN - 0.15} seconds={1.1} size={1.3} />
        <FireRing delay={DRAW_IN} reach={3.2} flames={16} seconds={0.9} />
        <FireRing delay={DRAW_IN + 0.15} reach={1.8} flames={10} seconds={0.7} />
      </group>
    </group>
  );
}
