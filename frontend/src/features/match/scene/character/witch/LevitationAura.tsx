"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial, type PointsMaterial } from "three";
import { AdditiveMaterial, AdditivePointsMaterial } from "../shared/additive";
import { useDisposable } from "../shared/disposal";
import { approach } from "../shared/easing";
import { jitter } from "../shared/hash";
import { pointsGeometry } from "../shared/pointsGeometry";
import { useRuneTexture } from "../shared/runeCircle";
import { levitationLift } from "./levitation";
import { useLightColumnTexture, useMoteTexture } from "./witchTextures";
import { useGlowColor } from "../shared/glowColor";

const SPIRAL_MOTES = 42;

interface AuraProps {
  /** Height of the figure, which sizes everything. */
  size: number;
  color: string;
  /** Levitation progress (0–1), read every frame. */
  progress: RefObject<number>;
  /** Hover height at full levitation, in the same units as `size`. */
  height: number;
}

/**
 * What shows a figure is levitating, drawn from the ground it left: a turning rune sigil, a
 * column of light up to its feet and motes spiralling up into it. All brighter while it's
 * still rising. Additive glow only, no lights (they'd recompile the scene).
 */
export function LevitationAura({ size, color, progress, height }: AuraProps) {
  const runes = useRuneTexture();
  const beam = useLightColumnTexture();
  const mote = useMoteTexture();
  const glow = useGlowColor(color, 1.6);
  const root = useRef<Group>(null);
  const sigil = useRef<Mesh>(null);
  const sigilMaterial = useRef<MeshBasicMaterial>(null);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const motesMaterial = useRef<PointsMaterial>(null);
  const last = useRef(0);
  /** 1 while rising, easing back to 0 once up: the effects flare as the figure climbs. */
  const surge = useRef(0);
  const motes = useMemo(
    () =>
      Array.from({ length: SPIRAL_MOTES }, (_, index) => ({
        climb: index / SPIRAL_MOTES,
        angle: jitter(index, 1) * Math.PI * 2,
        speed: 0.25 + jitter(index, 2) * 0.25,
      })),
    [],
  );
  const geometry = useDisposable(useMemo(() => pointsGeometry(SPIRAL_MOTES), []));

  useFrame((state, delta) => {
    const node = root.current;
    const current = progress.current;
    if (!node) return;
    const rising = current > last.current;
    last.current = current;
    surge.current = approach(surge.current, rising ? 1 : 0, rising ? 6 : 1.5, delta);
    const strength = Math.min(1, current * 4);
    node.visible = strength > 0.01;
    if (!node.visible) return;

    const time = state.clock.elapsedTime;
    const lift = levitationLift(current) * height;
    if (sigil.current) {
      sigil.current.rotation.z += delta * (0.4 + surge.current * 1.6);
      sigil.current.scale.setScalar(0.85 + strength * 0.15 + Math.sin(time * 3) * 0.02);
    }
    if (sigilMaterial.current) sigilMaterial.current.opacity = strength * (0.55 + surge.current * 0.45);
    if (column.current) {
      const reach = Math.max(lift, size * 0.05);
      column.current.scale.set(1, reach, 1);
      column.current.position.y = reach / 2;
    }
    if (columnMaterial.current) columnMaterial.current.opacity = strength * (0.18 + surge.current * 0.4);
    if (motesMaterial.current) motesMaterial.current.opacity = strength * (0.6 + surge.current * 0.4);

    // Motes climb from the sigil's rim to the figure's feet, closing in as they go.
    const positions = geometry.getAttribute("position");
    const top = lift + size * 0.15;
    motes.forEach((particle, index) => {
      particle.climb = (particle.climb + delta * particle.speed * (1 + surge.current * 1.5)) % 1;
      particle.angle += delta * (2 + surge.current * 3);
      const radius = size * (0.34 - particle.climb * 0.2);
      positions.setXYZ(
        index,
        Math.cos(particle.angle) * radius,
        particle.climb * top,
        Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={sigil} rotation-x={-Math.PI / 2} position-y={0.03}>
        <circleGeometry args={[size * 0.38, 64]} />
        <AdditiveMaterial ref={sigilMaterial} map={runes} color={glow} />
      </mesh>
      {/* Unit-tall, stretched to the hover height every frame. */}
      <mesh ref={column}>
        <cylinderGeometry args={[size * 0.14, size * 0.2, 1, 32, 1, true]} />
        <AdditiveMaterial ref={columnMaterial} map={beam} color={glow} side={DoubleSide} />
      </mesh>
      <points geometry={geometry}>
        <AdditivePointsMaterial ref={motesMaterial} map={mote} color={glow} size={size * 0.035} />
      </points>
    </group>
  );
}
