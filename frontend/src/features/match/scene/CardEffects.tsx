"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type RefObject } from "react";
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
import { CHEST_HEIGHT } from "./character/core/figure";
import { useAge } from "./useAge";
import { HealingEmitter } from "./vfx/healing";

// Colours pushed past 1.0 glow through the bloom pass.
/** The Arcane Shield's usual tint; a character may raise it in their own colour (see CharacterDefinition.shieldColor). */
export const DEFAULT_SHIELD_COLOR = "#22d3ee";
const BEAM_COLOR = new Color("#60a5fa").multiplyScalar(3);
const BEAM_CORE = new Color("#e0f2fe").multiplyScalar(3);
const Y_AXIS = new Vector3(0, 1, 0);

/** Wide enough round a winged figure that the wings stay inside, centred a little higher on them. */
const WINGED_SHIELD = { scale: 1.4, y: 1.2 };

/**
 * Arcane Shield: a hexagonal bubble around the player while the shield is up. It folds away while
 * the figure sits on its chair (`seated`) and comes back as it stands.
 */
export function ShieldBubble({
  color = DEFAULT_SHIELD_COLOR,
  winged = false,
  seated,
}: {
  color?: string;
  winged?: boolean;
  seated?: RefObject<boolean>;
}) {
  const shell = useRef<Group>(null);
  const wire = useRef<MeshBasicMaterial>(null);
  const shown = useRef(1);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.6), [color]);
  const size = winged ? WINGED_SHIELD.scale : 1;

  useFrame(({ clock }, delta) => {
    shown.current += ((seated?.current ? 0 : 1) - shown.current) * (1 - Math.exp(-8 * delta));
    if (shell.current) {
      shell.current.rotation.y += delta * 0.5;
      shell.current.scale.setScalar(size * shown.current);
      shell.current.visible = shown.current > 0.01;
    }
    if (wire.current) wire.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.2;
  });

  return (
    <group ref={shell} position-y={winged ? WINGED_SHIELD.y : 1} scale={size}>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial ref={wire} color={glow} wireframe transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
    </group>
  );
}

export type OrbPalette = "fate" | "oracle" | "luck";

const ORB_COLORS: Record<OrbPalette, { color: string; emissive: string; ring: string }> = {
  fate: { color: "#fb923c", emissive: "#ea580c", ring: "#fde68a" },
  oracle: { color: "#a78bfa", emissive: "#6d28d9", ring: "#e9d5ff" },
  luck: { color: "#4ade80", emissive: "#15803d", ring: "#fde047" },
};

/**
 * A glowing orb circled by a rune ring, hovering over the player while a dice card waits for
 * the next roll: Fate Rune, Oracle Eye or Lucky Charm.
 */
export function BoostOrb({ palette }: { palette: OrbPalette }) {
  const orb = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const { color, emissive, ring: ringColor } = ORB_COLORS[palette];

  useFrame(({ clock }, delta) => {
    if (!orb.current || !ring.current) return;
    orb.current.position.y = 2.6 + Math.sin(clock.elapsedTime * 2) * 0.12;
    ring.current.rotation.z += delta * 1.5;
  });

  return (
    <group ref={orb}>
      <mesh>
        <sphereGeometry args={[0.24, 32, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.6}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={ring} rotation-x={Math.PI / 2.4}>
        <torusGeometry args={[0.38, 0.02, 8, 48]} />
        <meshBasicMaterial color={ringColor} toneMapped={false} />
      </mesh>
    </group>
  );
}

const WIND_SECONDS = 3;

/** Wind Step: a golden cloud swirls in under the player, then drifts away. */
export function WindCloud() {
  const cloud = useRef<Group>(null);
  const age = useAge();

  useFrame(({ clock }) => {
    if (!cloud.current) return;
    const t = age(clock.elapsedTime);
    const grow = Math.min(1, t / 0.4);
    const fade = 1 - Math.max(0, (t - WIND_SECONDS + 0.6) / 0.6);
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

/** Seconds of healing motes: within the card's cast (timings.castMs), which unmounts the emitter. */
const BURST_SECONDS = 1;

/** Healing Herb: green motes rising round the player for a moment (see HealingParticles). */
export function HealBurst() {
  return <HealingEmitter seconds={BURST_SECONDS} />;
}

const BEAM_SECONDS = 1.4;

/** Arcane Blast: a blue energy beam from the caster to the target, flaring then fading. */
export function ArcaneBeam({ from, to }: { from: Vec3; to: Vec3 }) {
  // Positions at the moment of the cast: the target gets pushed away afterwards.
  const [ends] = useState(() => ({
    start: new Vector3(from[0], from[1] + CHEST_HEIGHT, from[2]),
    end: new Vector3(to[0], to[1] + CHEST_HEIGHT, to[2]),
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
