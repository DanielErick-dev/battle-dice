"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BackSide, Color, ShaderMaterial } from "three";

/** Past 1.0 so the moon blooms. */
const MOON_COLOR = new Color("#fff1cf").multiplyScalar(2.2);

interface SkyDomeProps {
  radius: number;
  horizon: string;
  zenith: string;
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
  varying vec3 vDirection;
  void main() {
    float height = clamp(vDirection.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(height, 0.45));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Night sky gradient (horizon matches the fog) with a large moon and its halo. */
export function SkyDome({ radius, horizon, zenith, moonPosition, moonRadius }: SkyDomeProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: new Color(horizon) },
          uZenith: { value: new Color(zenith) },
        },
      }),
    [horizon, zenith],
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      <mesh material={material} renderOrder={-1}>
        <sphereGeometry args={[radius, 32, 16]} />
      </mesh>

      <group position={moonPosition}>
        <mesh>
          <sphereGeometry args={[moonRadius, 32, 16]} />
          <meshBasicMaterial color={MOON_COLOR} fog={false} toneMapped={false} />
        </mesh>
        {[1.6, 2.6].map((scale, i) => (
          <mesh key={scale} scale={scale}>
            <sphereGeometry args={[moonRadius, 24, 12]} />
            <meshBasicMaterial
              color="#8f7cff"
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
