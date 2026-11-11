"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, type Group, type MeshBasicMaterial, type ShaderMaterial } from "three";
import { glowColor } from "@/features/characters/shared/glowColor";
import { SKY } from "../../realm/mix/palette";
import { blendRealm } from "../../realm/mix/realmMix";
import { useRealmMix } from "../../realm/mix/useRealmMix";
import { SKY_FRAGMENT, SKY_VERTEX } from "./skyShader";
import { uniform } from "@/features/shared/three/uniform";

/** Past 1.0 so the moon (and the blood moon, and the sun) bloom. */
const ORB = {
  mortal: glowColor("#e2e9f3", 1.9),
  infernal: glowColor("#ff2a12", 2.6),
  celestial: glowColor("#fffaf0", 3.2),
};
const HALO = { mortal: new Color("#7d8ea8"), infernal: new Color("#ff3a10"), celestial: new Color("#ffe6a8") };

interface SkyDomeProps {
  radius: number;
  moonPosition: [number, number, number];
  moonRadius: number;
}

/**
 * Sky gradient (horizon matches the fog) with a big moon and its halo. In the infernal realm
 * it fills with drifting smoke lit by embers under a blood moon; in the celestial realm it
 * turns to a bright day of soft clouds and the moon becomes the sun.
 */
export function SkyDome({ radius, moonPosition, moonRadius }: SkyDomeProps) {
  const mix = useRealmMix();
  const orb = useRef<MeshBasicMaterial>(null);
  const halos = useRef<(MeshBasicMaterial | null)[]>([]);
  const moon = useRef<Group>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uHorizon: { value: SKY.mortal.horizon.clone() },
      uZenith: { value: SKY.mortal.zenith.clone() },
      uInfernal: { value: 0 },
      uCelestial: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    const current = mix.current;
    const shader = material.current;
    uniform(shader, "uTime").value += delta;
    uniform(shader, "uInfernal").value = current.infernal;
    uniform(shader, "uCelestial").value = current.celestial;
    blendRealm(
      uniform(shader, "uHorizon").value,
      SKY.mortal.horizon,
      SKY.infernal.horizon,
      SKY.celestial.horizon,
      current,
    );
    blendRealm(uniform(shader, "uZenith").value, SKY.mortal.zenith, SKY.infernal.zenith, SKY.celestial.zenith, current);

    if (orb.current) blendRealm(orb.current.color, ORB.mortal, ORB.infernal, ORB.celestial, current);
    halos.current.forEach(
      (halo) => halo && blendRealm(halo.color, HALO.mortal, HALO.infernal, HALO.celestial, current),
    );
    // The blood moon swells; the sun is a touch bigger too.
    moon.current?.scale.setScalar(1 + current.infernal * 0.35 + current.celestial * 0.2);
  });

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[radius, 32, 16]} />
        <shaderMaterial
          ref={material}
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
          uniforms={uniforms}
          side={BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <group ref={moon} position={moonPosition}>
        <mesh>
          <sphereGeometry args={[moonRadius, 32, 16]} />
          {/* Colours are blended every frame (never the shared constants themselves). */}
          <meshBasicMaterial ref={orb} fog={false} toneMapped={false} />
        </mesh>
        {[1.6, 2.6].map((scale, i) => (
          <mesh key={scale} scale={scale}>
            <sphereGeometry args={[moonRadius, 24, 12]} />
            <meshBasicMaterial
              ref={(material) => {
                halos.current[i] = material;
              }}
              transparent
              opacity={i === 0 ? 0.14 : 0.06}
              depthWrite={false}
              blending={AdditiveBlending}
              fog={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
