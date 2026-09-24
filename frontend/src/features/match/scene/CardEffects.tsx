"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import {
  AdditiveBlending,
  Color,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import type { Vec3 } from "./boardLayout";

// Colours pushed past 1.0 glow through the bloom pass.
const SHIELD_COLOR = new Color("#22d3ee").multiplyScalar(1.6);
const BEAM_COLOR = new Color("#60a5fa").multiplyScalar(3);
const BEAM_CORE = new Color("#e0f2fe").multiplyScalar(3);
const Y_AXIS = new Vector3(0, 1, 0);

/**
 * Seconds since this component first rendered a frame; one-shot effects mount with a
 * fresh key per cast and fade themselves out.
 */
function useAge() {
  const bornAt = useRef<number | null>(null);
  return (now: number) => {
    bornAt.current ??= now;
    return now - bornAt.current;
  };
}

/** Ki Barrier: a hexagonal bubble around the player while the shield is up. */
export function ShieldBubble() {
  const shell = useRef<Group>(null);
  const wire = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (shell.current) shell.current.rotation.y += delta * 0.5;
    if (wire.current) wire.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.2;
  });

  return (
    <group ref={shell} position-y={1}>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial ref={wire} color={SHIELD_COLOR} wireframe transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** Dragon Ball: an orange orb with stars hovering over the player until the wished roll. */
export function DragonBallOrb() {
  const orb = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!orb.current) return;
    orb.current.rotation.y += delta * 1.2;
    orb.current.position.y = 2.6 + Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  return (
    <group ref={orb}>
      <mesh>
        <sphereGeometry args={[0.28, 32, 16]} />
        <meshStandardMaterial color="#fb923c" emissive="#ea580c" emissiveIntensity={1.6} roughness={0.15} metalness={0.1} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.2, (i % 2 === 0 ? 0.06 : -0.06), Math.sin(angle) * 0.2]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#dc2626" />
          </mesh>
        );
      })}
      <pointLight color="#fb923c" intensity={2} distance={3} />
    </group>
  );
}

const NIMBUS_SECONDS = 3;

/** Flying Nimbus: a golden cloud swirls in under the player, then drifts away. */
export function NimbusCloud() {
  const cloud = useRef<Group>(null);
  const age = useAge();

  useFrame(({ clock }) => {
    if (!cloud.current) return;
    const t = age(clock.elapsedTime);
    const grow = Math.min(1, t / 0.4);
    const fade = 1 - Math.max(0, (t - NIMBUS_SECONDS + 0.6) / 0.6);
    cloud.current.visible = fade > 0;
    cloud.current.scale.setScalar(Math.max(0.001, grow * fade));
    cloud.current.rotation.y = t * 0.8;
  });

  return (
    <group ref={cloud} position-y={0.25}>
      {[
        [0, 0, 0, 0.42],
        [0.4, 0.02, 0.1, 0.3],
        [-0.38, 0, -0.08, 0.32],
        [0.1, 0.05, 0.36, 0.28],
        [-0.12, 0.03, -0.36, 0.28],
      ].map(([x, y, z, r]) => (
        <mesh key={`${x}:${z}`} position={[x, y, z]} scale={[1, 0.55, 1]}>
          <sphereGeometry args={[r, 16, 12]} />
          <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.9} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

const BURST_SECONDS = 1.6;

/** Senzu Bean: a burst of green sparks rising around the player. */
export function HealBurst() {
  const [visible, setVisible] = useState(true);
  const age = useAge();

  useFrame(({ clock }) => {
    if (visible && age(clock.elapsedTime) > BURST_SECONDS) setVisible(false);
  });

  if (!visible) return null;
  return <Sparkles count={40} scale={[1.6, 2.4, 1.6]} position-y={1.1} size={5} speed={2.5} color="#4ade80" />;
}

const BEAM_SECONDS = 1.4;

/** Kamehameha: a blue energy beam from the caster to the target, flaring then fading. */
export function KamehamehaBeam({ from, to }: { from: Vec3; to: Vec3 }) {
  // Positions at the moment of the cast: the target gets pushed away afterwards.
  const [ends] = useState(() => ({
    start: new Vector3(from[0], 1.1, from[2]),
    end: new Vector3(to[0], 1.1, to[2]),
  }));
  const root = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const outer = useRef<MeshStandardMaterial>(null);
  const core = useRef<Mesh>(null);
  const age = useAge();

  const length = ends.start.distanceTo(ends.end);
  const middle = ends.start.clone().lerp(ends.end, 0.5);
  const direction = ends.end.clone().sub(ends.start).normalize();
  const orientation = new Quaternion().setFromUnitVectors(Y_AXIS, direction);

  useFrame(({ clock }) => {
    if (!root.current || !beam.current) return;
    const t = age(clock.elapsedTime) / BEAM_SECONDS;
    const surge = Math.min(1, t * 5);
    const fade = 1 - Math.max(0, (t - 0.6) / 0.4);
    root.current.visible = fade > 0;
    beam.current.scale.set(fade * (1 + Math.sin(clock.elapsedTime * 40) * 0.08), surge, fade);
    if (outer.current) outer.current.opacity = 0.7 * fade;
    if (core.current) core.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 30) * 0.15);
  });

  return (
    <group ref={root}>
      <group ref={beam} position={middle} quaternion={orientation}>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, length, 24, 1, true]} />
          <meshStandardMaterial
            ref={outer}
            color={BEAM_COLOR}
            emissive={BEAM_COLOR}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, length, 16]} />
          <meshBasicMaterial color={BEAM_CORE} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={core} position={ends.start}>
        <sphereGeometry args={[0.45, 24, 16]} />
        <meshBasicMaterial color={BEAM_CORE} transparent opacity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}
