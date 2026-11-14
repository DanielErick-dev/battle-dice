"use client";

import { QuadraticBezierLine, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from "three";
import type { Element } from "@/game/domain/types";
import { type Vec3 } from "@/features/shared/board/boardLayout";
import { useAge } from "@/features/shared/three/useAge";
import { FireRing, FlamePillar } from "../akane/Blaze";
import { CONVERGENCE, ELEMENT_COLOR, clamp01, easeOut } from "./palette";

/** One bending's burst: stone shards, a splash ring, a ring of fire, a whirl of wind, the explosion or the Convergence. */
export function BendingBurst({ kind }: { kind: Element | "explosion" | "convergence" }) {
  switch (kind) {
    case "earth":
      return <StoneBurst />;
    case "water":
      return <SplashRing color={ELEMENT_COLOR.water} />;
    case "fire":
      return <FireRing reach={1.1} flames={10} />;
    case "wind":
      return <SplashRing color={ELEMENT_COLOR.wind} rising />;
    case "explosion":
      return (
        <>
          <FireRing reach={3.2} flames={18} seconds={1} />
          <FlamePillar seconds={1} size={1.2} />
        </>
      );
    case "convergence":
      return (
        <>
          <SplashRing color={CONVERGENCE} rising />
          <Sparkles count={40} scale={[2, 3, 2]} position-y={1.2} size={7} speed={2} color={CONVERGENCE} />
        </>
      );
  }
}

const BURST_SECONDS = 0.9;

function StoneBurst() {
  const root = useRef<Group>(null);
  const shards = useRef<(Mesh | null)[]>([]);
  const age = useAge();
  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) / BURST_SECONDS;
    if (!root.current) return;
    root.current.visible = t < 1;
    shards.current.forEach((shard, index) => {
      if (!shard) return;
      const angle = (index / 8) * Math.PI * 2;
      const reach = easeOut(clamp01(t)) * 1.1;
      shard.position.set(Math.cos(angle) * reach, Math.sin(clamp01(t) * Math.PI) * 0.9, Math.sin(angle) * reach);
      shard.rotation.set(t * 6 + index, t * 4, 0);
    });
  });
  return (
    <group ref={root}>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            shards.current[index] = mesh;
          }}
          scale={0.14}
        >
          <dodecahedronGeometry />
          <meshStandardMaterial color={index % 2 ? "#92400e" : "#a16207"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function SplashRing({ color, rising = false }: { color: string; rising?: boolean }) {
  const ring = useRef<Mesh>(null);
  const age = useAge();
  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) / BURST_SECONDS;
    if (!ring.current) return;
    ring.current.visible = t < 1;
    ring.current.scale.setScalar(0.3 + easeOut(clamp01(t)) * 1.8);
    ring.current.position.y = rising ? 0.2 + t * 1.6 : 0.1;
    (ring.current.material as MeshBasicMaterial).opacity = 0.8 * (1 - clamp01(t));
  });
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[1, 0.08, 8, 40]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

/** The Breeze Heist: a streak of wind from the robbed figure to him. */
export function HeistStreak({ from, to }: { from: Vec3; to: Vec3 }) {
  const age = useAge();
  const line = useRef<{ material: { opacity: number } } | null>(null);
  useFrame(({ clock }) => {
    if (line.current) line.current.material.opacity = Math.max(0, 1 - age(clock.elapsedTime) / 1.2);
  });
  const mid: Vec3 = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 2, (from[2] + to[2]) / 2];
  return (
    <QuadraticBezierLine
      ref={line as never}
      start={[from[0], from[1] + 1, from[2]]}
      end={[to[0], to[1] + 1, to[2]]}
      mid={mid}
      color={ELEMENT_COLOR.wind}
      lineWidth={4}
      transparent
    />
  );
}
