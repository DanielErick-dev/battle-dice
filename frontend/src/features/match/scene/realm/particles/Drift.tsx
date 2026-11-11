"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Color, type ShaderMaterial } from "three";
import type { RealmMix } from "../mix/realmMix";
import { useRealmMix } from "../mix/useRealmMix";
import { driftCloud } from "./layout";
import { POINTS_FRAGMENT, POINTS_VERTEX } from "./shaders";
import { uniform } from "@/features/shared/three/uniform";

interface DriftProps {
  realm: keyof RealmMix;
  count: number;
  radius: number;
  floor: number;
  ceiling: number;
  color: Color;
  size: number;
  rise: number;
  sway: number;
  flicker: number;
  seed: number;
}

/** A cloud of glowing particles rising through the arena while its realm is showing. */
export function Drift({ realm, count, radius, floor, ceiling, color, size, rise, sway, flicker, seed }: DriftProps) {
  const mix = useRealmMix();
  const material = useRef<ShaderMaterial>(null);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => {
    const { positions, seeds } = driftCloud(seed, count, radius, floor, ceiling);
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return result;
  }, [count, radius, floor, ceiling, seed]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRise: { value: rise },
      uSway: { value: sway },
      uSize: { value: size },
      uFloor: { value: floor },
      uCeiling: { value: ceiling },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: color },
      uOpacity: { value: 0 },
      uFlicker: { value: flicker },
    }),
    [rise, sway, size, floor, ceiling, pixelRatio, color, flicker],
  );

  useFrame((_, delta) => {
    const current = material.current;
    if (!current) return;
    const amount = mix.current[realm];
    current.visible = amount > 0.01;
    uniform(current, "uTime").value += delta;
    uniform(current, "uOpacity").value = amount;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={POINTS_VERTEX}
        fragmentShader={POINTS_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
