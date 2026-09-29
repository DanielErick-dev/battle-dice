"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, type Group, type MeshBasicMaterial, type ShaderMaterial } from "three";
import { blendRealm, SKY, useRealmMix } from "../realm/RealmAtmosphere";
import { NOISE_GLSL } from "../realm/noise";

/** Past 1.0 so the moon (and the blood moon, and the sun) bloom. */
const ORB = {
  mortal: new Color("#fff1cf").multiplyScalar(2.2),
  infernal: new Color("#ff2a12").multiplyScalar(2.6),
  celestial: new Color("#fffaf0").multiplyScalar(3.2),
};
const HALO = { mortal: new Color("#8f7cff"), infernal: new Color("#ff3a10"), celestial: new Color("#ffe6a8") };

interface SkyDomeProps {
  radius: number;
  moonPosition: [number, number, number];
  moonRadius: number;
}

const VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform float uInfernal;
  uniform float uCelestial;
  uniform float uTime;
  varying vec3 vDirection;

  ${NOISE_GLSL}

  void main() {
    float height = clamp(vDirection.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(height, 0.45));
    // Project the dome onto a flat cloud layer overhead.
    vec2 layer = vDirection.xz / (vDirection.y + 0.25);

    if (uInfernal > 0.001) {
      float smoke = fbm(layer * 1.6 + vec2(uTime * 0.03, -uTime * 0.02));
      float churn = fbm(layer * 3.4 - vec2(uTime * 0.05, uTime * 0.04) + smoke * 1.5);
      vec3 ash = vec3(0.05, 0.012, 0.01);
      vec3 embers = vec3(1.6, 0.35, 0.05) * pow(churn, 3.0) * (1.4 - height);
      vec3 hell = mix(color, ash, smoothstep(0.35, 0.75, smoke) * 0.85) + embers;
      // Glow of fire along the horizon.
      hell += vec3(0.9, 0.18, 0.02) * pow(1.0 - height, 6.0) * 1.2;
      color = mix(color, hell, uInfernal);
    }

    if (uCelestial > 0.001) {
      float cloud = fbm(layer * 1.2 + vec2(uTime * 0.012, uTime * 0.006));
      float puff = smoothstep(0.48, 0.78, cloud) * smoothstep(0.0, 0.25, height);
      vec3 heaven = mix(color, vec3(0.95, 0.9, 0.88), puff * 0.75);
      heaven += vec3(1.0, 0.8, 0.5) * pow(1.0 - height, 5.0) * 0.25;
      color = mix(color, heaven, uCelestial);
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

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
    const { uniforms } = material.current;
    uniforms.uTime.value += delta;
    uniforms.uInfernal.value = current.infernal;
    uniforms.uCelestial.value = current.celestial;
    blendRealm(uniforms.uHorizon.value, SKY.mortal.horizon, SKY.infernal.horizon, SKY.celestial.horizon, current);
    blendRealm(uniforms.uZenith.value, SKY.mortal.zenith, SKY.infernal.zenith, SKY.celestial.zenith, current);

    if (orb.current) blendRealm(orb.current.color, ORB.mortal, ORB.infernal, ORB.celestial, current);
    halos.current.forEach((halo) => halo && blendRealm(halo.color, HALO.mortal, HALO.infernal, HALO.celestial, current));
    // The blood moon swells; the sun is a touch bigger too.
    moon.current?.scale.setScalar(1 + current.infernal * 0.35 + current.celestial * 0.2);
  });

  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[radius, 32, 16]} />
        <shaderMaterial
          ref={material}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
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
