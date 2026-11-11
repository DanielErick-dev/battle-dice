"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, UniformsLib, UniformsUtils, Vector2, Vector3, type ShaderMaterial } from "three";
import { SKY } from "../../realm/mix/palette";
import { blendRealm } from "../../realm/mix/realmMix";
import { useRealmMix } from "../../realm/mix/useRealmMix";
import { OCEAN_FRAGMENT, OCEAN_VERTEX } from "./oceanShader";
import { uniform } from "@/features/shared/three/uniform";

interface OceanProps {
  /** Water surface height. */
  level: number;
  /** Side of the square water plane; should reach past the fog so the edge never shows. */
  size: number;
  /** Half extents of the island and how far back its middle lies, where the foam breaks. */
  shoreHalfSize: [number, number];
  shoreCenterZ: number;
  /** World position of the moon, for the glitter path on the water. */
  moonPosition: [number, number, number];
}

/**
 * Animated night sea: layered waves, sky reflection at grazing angles, moon glitter and shore
 * foam. Stays water in hell (only the sky burns); turns to a sea of clouds in the celestial realm.
 */
export function Ocean({ level, size, shoreHalfSize, shoreCenterZ, moonPosition }: OceanProps) {
  const material = useRef<ShaderMaterial>(null);
  const mix = useRealmMix();
  const uniforms = useMemo(
    () =>
      UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uDeep: { value: new Color("#02070c") },
          uShallow: { value: new Color("#0a1d26") },
          uSky: { value: new Color("#1b2430") },
          uFoam: { value: new Color("#8fa2b2") },
          uMoonColor: { value: new Color("#d9e2ec") },
          uMoonPosition: { value: new Vector3() },
          uShoreHalf: { value: new Vector2() },
          uShoreCenterZ: { value: 0 },
          uCelestial: { value: 0 },
          uHorizon: { value: new Color() },
        },
      ]),
    [],
  );

  useFrame((_, delta) => {
    const current = material.current;
    if (!current) return;
    const realm = mix.current;
    uniform(current, "uTime").value += delta;
    uniform(current, "uCelestial").value = realm.celestial;
    blendRealm(
      uniform(current, "uHorizon").value,
      SKY.mortal.horizon,
      SKY.infernal.horizon,
      SKY.celestial.horizon,
      realm,
    );
    uniform(current, "uMoonPosition").value.set(...moonPosition);
    uniform(current, "uShoreHalf").value.set(...shoreHalfSize);
    uniform(current, "uShoreCenterZ").value = shoreCenterZ;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={level}>
      <planeGeometry args={[size, size, 160, 160]} />
      <shaderMaterial
        ref={material}
        vertexShader={OCEAN_VERTEX}
        fragmentShader={OCEAN_FRAGMENT}
        uniforms={uniforms}
        fog
      />
    </mesh>
  );
}
