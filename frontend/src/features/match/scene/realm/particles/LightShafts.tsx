"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type ShaderMaterial } from "three";
import { useRealmMix } from "../mix/useRealmMix";
import { shaftLayout } from "./layout";
import { SHAFT_FRAGMENT, SHAFT_VERTEX } from "./shaders";
import { uniform } from "@/features/shared/three/uniform";

/** Beams of sunlight slanting down through the clouds while the celestial realm shows. */
export function LightShafts({ radius }: { radius: number }) {
  const mix = useRealmMix();
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const shafts = useMemo(() => shaftLayout(radius), [radius]);
  const uniforms = useMemo(
    () => shafts.map(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color("#fff0c4") } })),
    [shafts],
  );

  useFrame(({ clock }) => {
    const amount = mix.current.celestial;
    materials.current.forEach((material, i) => {
      if (!material) return;
      material.visible = amount > 0.01;
      uniform(material, "uOpacity").value = amount * (0.16 + 0.06 * Math.sin(clock.elapsedTime * 0.5 + i));
      uniform(material, "uTime").value = clock.elapsedTime;
    });
  });

  return (
    <>
      {shafts.map((shaft, i) => (
        <mesh key={i} position={shaft.position} rotation={shaft.tilt}>
          <cylinderGeometry args={[shaft.width * 1.8, shaft.width, 30, 24, 1, true]} />
          <shaderMaterial
            ref={(material) => {
              materials.current[i] = material;
            }}
            vertexShader={SHAFT_VERTEX}
            fragmentShader={SHAFT_FRAGMENT}
            uniforms={uniforms[i]}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            fog={false}
          />
        </mesh>
      ))}
    </>
  );
}
