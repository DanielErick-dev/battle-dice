"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useSoftDisc } from "../kit/matchAssets";

const FIREFLIES = 26;

const FIREFLY = new Color("#e4ff7a").multiplyScalar(1.8);

/** Wandering sparks that glow and go dark in turn; dark ones add nothing, being additive. */
export function Fireflies() {
  const disc = useSoftDisc();
  const { geometry, flies } = useMemo(() => {
    const random = seededRandom(71);
    const flies = Array.from({ length: FIREFLIES }, () => ({
      x: (random() - 0.5) * 1.5,
      y: 0.12 + random() * 1.25,
      z: -0.95 + random() * 1.25,
      phase: random() * Math.PI * 2,
      rate: 0.5 + random() * 0.9,
      wander: 0.06 + random() * 0.1,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    return { geometry, flies };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    flies.forEach(({ x, y, z, phase, rate, wander }, index) => {
      positions.setXYZ(
        index,
        x + Math.sin(t * 0.31 * rate + phase) * wander * 2,
        y + Math.sin(t * 0.47 * rate + phase * 2) * wander,
        z + Math.cos(t * 0.27 * rate + phase) * wander * 2,
      );
      const glow = Math.max(0, Math.sin(t * rate + phase)) ** 3;
      colors.setXYZ(index, FIREFLY.r * glow, FIREFLY.g * glow, FIREFLY.b * glow);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={disc}
        vertexColors
        size={0.055}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
