"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group } from "three";
import type { Element } from "@/game/domain/types";
import { FlameCard } from "../akane/FlameCard";
import { CONVERGENCE, ELEMENT_COLOR } from "./palette";

/** The elements he has bent since his last Convergence, circling his waist. */
export function ElementOrbit({ elements, bright = false }: { elements: readonly Element[]; bright?: boolean }) {
  const root = useRef<Group>(null);
  useFrame((_, delta) => {
    if (root.current) root.current.rotation.y += delta * (bright ? 2.4 : 1.2);
  });
  return (
    <group ref={root} position-y={0.95}>
      {elements.map((element, index) => {
        const angle = (index / Math.max(1, elements.length)) * Math.PI * 2;
        return (
          <group key={element} position={[Math.cos(angle) * 0.62, Math.sin(angle * 2) * 0.08, Math.sin(angle) * 0.62]}>
            <ElementCharm element={element} bright={bright} />
          </group>
        );
      })}
    </group>
  );
}

function ElementCharm({ element, bright }: { element: Element; bright: boolean }) {
  const color = ELEMENT_COLOR[element];
  const glow = bright ? 2.4 : 1.2;
  switch (element) {
    case "earth":
      return (
        <mesh scale={0.11}>
          <dodecahedronGeometry />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow * 0.4} flatShading />
        </mesh>
      );
    case "water":
      return (
        <mesh scale={0.1} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1, 0.35, 8, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={0.85} />
        </mesh>
      );
    case "fire":
      return <FlameCard width={0.22} position={[0, -0.1, 0]} seed={2.7} glow={glow} />;
    case "wind":
      return (
        <mesh scale={0.11} rotation-z={0.6}>
          <torusGeometry args={[1, 0.15, 6, 20, Math.PI * 1.5]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} />
        </mesh>
      );
  }
}

/** The Convergence: all four elements whirling fast round him, with a few sparks. */
export function ConvergenceAura() {
  return (
    <group>
      <ElementOrbit elements={["earth", "water", "fire", "wind"]} bright />
      <Sparkles count={14} scale={[1.4, 2.2, 1.4]} position-y={1} size={3} speed={1.2} color={CONVERGENCE} />
    </group>
  );
}

/** Hands smouldering: his die is enchanted for this roll. */
export function CombustionHands() {
  return <Sparkles count={16} scale={[0.9, 0.5, 0.9]} position-y={1} size={5} speed={1.2} color={ELEMENT_COLOR.fire} />;
}

/** His hidden breeze, only for his own eyes: a faint gust curling at his feet. */
export function BreezeCoil() {
  return (
    <Sparkles count={14} scale={[1.2, 0.3, 1.2]} position-y={0.15} size={3} speed={2.4} color={ELEMENT_COLOR.wind} />
  );
}
