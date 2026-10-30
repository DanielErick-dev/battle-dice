"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from "three";
import type { Crown } from "@/game/domain/types";
import { useAge } from "../../useAge";

/** Over the head, in the token effects' units (a figure stands 1.9 tall in them). */
export const CROWN_HEIGHT = 2.02;
const RADIUS = 0.17;
const SPIKES = 8;
/** Spike heights round the band: even points for heaven's crown, jagged and broken for hell's. */
const SERAPHIC_SPIKES = Array.from({ length: SPIKES }, (_, index) => (index % 2 === 0 ? 0.13 : 0.08));
const INFERNAL_SPIKES = [0.2, 0.07, 0.15, 0.04, 0.22, 0.09, 0.12, 0.05];

const LOOKS = {
  seraphic: { metal: "#f5c542", glow: "#fff2b0", emissive: 0.9 },
  infernal: { metal: "#140404", glow: "#ff2a10", emissive: 0.15 },
} as const;

/**
 * Seraphiel's crown floating over his head: a ring of gold points haloed in light out of heaven,
 * or, after the Fall, a band of black iron with broken spikes glowing like embers at the tips and
 * sparks drifting off it. It turns slowly and bobs. In the token's effect frame.
 */
export function SeraphCrown({ crown }: { crown: Crown }) {
  const root = useRef<Group>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const look = LOOKS[crown];
  const spikes = crown === "infernal" ? INFERNAL_SPIKES : SERAPHIC_SPIKES;
  const glow = useMemo(() => new Color(look.glow).multiplyScalar(2.2), [look.glow]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y = t * 0.6;
      root.current.position.y = CROWN_HEIGHT + Math.sin(t * 1.8) * 0.025;
    }
    if (halo.current) halo.current.opacity = (crown === "infernal" ? 0.35 : 0.45) + Math.sin(t * 5.3) * 0.08;
  });

  return (
    <group ref={root} position-y={CROWN_HEIGHT}>
      <mesh>
        <torusGeometry args={[RADIUS, 0.018, 8, 32]} />
        <meshStandardMaterial
          color={look.metal}
          emissive={look.glow}
          emissiveIntensity={look.emissive}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      {spikes.map((height, index) => {
        const angle = (index / SPIKES) * Math.PI * 2;
        return (
          <group key={index} position={[Math.cos(angle) * RADIUS, height / 2, Math.sin(angle) * RADIUS]}>
            <mesh>
              <coneGeometry args={[0.022, height, 6]} />
              <meshStandardMaterial
                color={look.metal}
                emissive={look.glow}
                emissiveIntensity={look.emissive}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
            {/* A spark at the tip: light out of heaven, an ember in hell. */}
            <mesh position-y={height / 2}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshBasicMaterial color={glow} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[RADIUS * 0.7, RADIUS * 1.6, 32]} />
        <meshBasicMaterial
          ref={halo}
          color={glow}
          transparent
          opacity={0.4}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {crown === "infernal" && (
        <Sparkles count={10} scale={[0.5, 0.5, 0.5]} position-y={0.2} size={3} speed={1.2} color="#ff4a1a" />
      )}
    </group>
  );
}

const FALL_SECONDS = 2.4;
const FEATHERS = 16;

/** A steady scatter in [0, 1) for each feather, so every fall looks alike. */
const scatter = (n: number) => {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Where each feather comes off and how it falls. */
const DRIFT = Array.from({ length: FEATHERS }, (_, index) => ({
  angle: (index / FEATHERS) * Math.PI * 2 + scatter(index) * 0.4,
  radius: 0.3 + scatter(index + 0.1) * 0.45,
  height: 1.2 + scatter(index + 0.2) * 0.7,
  spin: (scatter(index + 0.3) - 0.5) * 6,
  delay: scatter(index + 0.4) * 0.4,
}));

/**
 * The Fall, round Seraphiel as hell takes him: white feathers torn off his wings drift down,
 * catching fire and turning to ash, while a ring of fire rolls out over the ground and embers
 * rise through him. In the token's effect frame; mounted fresh with every fall.
 */
export function FallBurst() {
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const feathers = useRef<(Mesh | null)[]>([]);
  const featherMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const age = useAge();
  const white = useMemo(() => new Color("#fffaf0"), []);
  const fire = useMemo(() => new Color("#ff5a14").multiplyScalar(2), []);
  const ash = useMemo(() => new Color("#1a1210"), []);
  const scratch = useMemo(() => new Color(), []);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    if (root.current) root.current.visible = t < FALL_SECONDS;
    if (t >= FALL_SECONDS) return;
    const u = t / FALL_SECONDS;
    ring.current?.scale.setScalar(0.2 + (1 - (1 - u) ** 3) * 2.6);
    if (ringMaterial.current) ringMaterial.current.opacity = 0.85 * (1 - u);

    DRIFT.forEach((feather, index) => {
      const mesh = feathers.current[index];
      const material = featherMaterials.current[index];
      if (!mesh || !material) return;
      const f = Math.max(0, (t - feather.delay) / (FALL_SECONDS - feather.delay));
      const radius = feather.radius + f * 0.5;
      mesh.position.set(
        Math.cos(feather.angle + f * 1.5) * radius,
        feather.height * (1 - f) + Math.sin(f * 12 + index) * 0.05,
        Math.sin(feather.angle + f * 1.5) * radius,
      );
      mesh.rotation.set(Math.sin(f * 7 + index) * 0.8, feather.spin * f, Math.cos(f * 5 + index) * 0.6);
      // White, then burning, then ash, then gone.
      if (f < 0.4) scratch.copy(white).lerp(fire, f / 0.4);
      else scratch.copy(fire).lerp(ash, Math.min(1, (f - 0.4) / 0.4));
      material.color.copy(scratch);
      material.opacity = f < 0.8 ? 1 : 1 - (f - 0.8) / 0.2;
    });
  });

  return (
    <group ref={root}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.05}>
        <ringGeometry args={[0.55, 0.75, 48]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={fire}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {DRIFT.map((_, index) => (
        <mesh key={index} ref={(mesh) => void (feathers.current[index] = mesh)}>
          <planeGeometry args={[0.06, 0.16]} />
          <meshBasicMaterial
            ref={(material) => void (featherMaterials.current[index] = material)}
            transparent
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <Sparkles count={50} scale={[1.4, 2.4, 1.4]} position-y={1.2} size={6} speed={2.5} color="#ff3a12" />
    </group>
  );
}
