"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial, type PointsMaterial } from "three";
import { AdditiveMaterial, AdditivePointsMaterial } from "../shared/additive";
import { useDisposable } from "../shared/disposal";
import { clamp01, easeOutCubic, easeOutQuad } from "../shared/easing";
import { jitter } from "../shared/hash";
import { pointsGeometry } from "../shared/pointsGeometry";
import { useLightColumnTexture, useMoteTexture } from "./witchTextures";
import { useGlowColor } from "../shared/glowColor";

/** Seconds the burst of power as a levitation starts lasts. */
const BURST_SECONDS = 1.8;
const BURST_MOTES = 64;

/**
 * The burst of power as a levitation starts: two shockwaves racing out over the ground, a pillar
 * of light that flares and narrows, and motes flung up and out. Plays once; remount (new `key`)
 * to play it again.
 */
export function LevitationBurst({ size, color }: { size: number; color: string }) {
  const beam = useLightColumnTexture();
  const mote = useMoteTexture();
  const glow = useGlowColor(color, 1.8);
  const root = useRef<Group>(null);
  const waves = useRef<(Mesh | null)[]>([]);
  const waveMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const pillar = useRef<Mesh>(null);
  const pillarMaterial = useRef<MeshBasicMaterial>(null);
  const motesMaterial = useRef<PointsMaterial>(null);
  const started = useRef<number | null>(null);
  const motes = useMemo(
    () =>
      Array.from({ length: BURST_MOTES }, (_, index) => ({
        angle: jitter(index, 3) * Math.PI * 2,
        out: 0.3 + jitter(index, 4) * 0.7,
        up: 0.8 + jitter(index, 5) * 1.6,
      })),
    [],
  );
  const geometry = useDisposable(useMemo(() => pointsGeometry(BURST_MOTES), []));

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - started.current;
    const t = Math.min(1, elapsed / BURST_SECONDS);
    node.visible = t < 1;
    if (t >= 1) return;

    waves.current.forEach((wave, index) => {
      const material = waveMaterials.current[index];
      if (!wave || !material) return;
      const local = clamp01((elapsed - index * 0.18) / 0.9);
      wave.visible = local > 0 && local < 1;
      wave.scale.setScalar(0.1 + easeOutCubic(local) * size * 1.1);
      material.opacity = (1 - local) * 0.9;
    });

    const flare = Math.min(1, elapsed / 0.12);
    const fade = Math.max(0, 1 - elapsed / 1.1);
    if (pillar.current) pillar.current.scale.set(0.4 + fade * 0.6, 1, 0.4 + fade * 0.6);
    if (pillarMaterial.current) pillarMaterial.current.opacity = flare * fade * 0.9;

    const positions = geometry.getAttribute("position");
    const fly = easeOutQuad(t);
    motes.forEach((particle, index) => {
      const radius = size * particle.out * fly * 0.8;
      positions.setXYZ(
        index,
        Math.cos(particle.angle) * radius,
        size * particle.up * fly * 0.6,
        Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
    if (motesMaterial.current) motesMaterial.current.opacity = 1 - t;
  });

  return (
    <group ref={root}>
      {[0, 1].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            waves.current[index] = mesh;
          }}
          rotation-x={-Math.PI / 2}
          position-y={0.05}
          visible={false}
        >
          <ringGeometry args={[0.82, 1, 64]} />
          <AdditiveMaterial
            ref={(material) => {
              waveMaterials.current[index] = material;
            }}
            color={glow}
          />
        </mesh>
      ))}
      <mesh ref={pillar} position-y={size * 1.25}>
        <cylinderGeometry args={[size * 0.16, size * 0.26, size * 2.5, 32, 1, true]} />
        <AdditiveMaterial ref={pillarMaterial} map={beam} color={glow} opacity={0} side={DoubleSide} />
      </mesh>
      <points geometry={geometry}>
        <AdditivePointsMaterial ref={motesMaterial} map={mote} color={glow} size={size * 0.05} />
      </points>
    </group>
  );
}
