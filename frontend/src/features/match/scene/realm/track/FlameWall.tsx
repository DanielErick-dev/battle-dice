"use client";

import { Billboard } from "@react-three/drei";
import type { ShaderMaterial } from "three";
import { NOISE_GLSL } from "../glsl";

const FLAME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vec4 origin = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vSeed = origin.x * 1.7 + origin.z * 2.3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** A licking flame: a noisy teardrop, white-hot at the root, fading to red at the tips. */
const FLAME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  ${NOISE_GLSL}
  void main() {
    float y = vUv.y;
    float n = fbm(vec2(vUv.x * 3.5 + vSeed, y * 2.8 - uTime * 3.2 + vSeed));
    // Distance from the flame's wavering centre line (0) to the plane's edge (1).
    float x = abs((vUv.x - 0.5) * 2.0 + (n - 0.5) * 0.7 * y);
    float edge = (1.0 - y) * 0.85 + 0.05;
    float body = 1.0 - smoothstep(edge * 0.3, edge, x);
    body *= 1.0 - smoothstep(0.3, 1.0, y + (n - 0.5) * 0.45);
    float heat = body * (1.0 - y);
    vec3 color = mix(vec3(2.2, 0.3, 0.02), vec3(2.6, 1.25, 0.25), smoothstep(0.25, 0.8, heat));
    float alpha = body * uOpacity;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Flames licking up on both sides of an infernal tile, always facing the camera; `flames` collects
 * their materials so the track can animate and fade them all.
 */
export function FlameWall({ flames }: { flames: Set<ShaderMaterial> }) {
  return (
    <>
      {[
        [-1.3, 0.3, 1.9],
        [1.3, -0.35, 1.5],
        [-1.15, -0.75, 1.2],
        [1.2, 0.7, 1.7],
      ].map(([x, z, height]) => (
        <Billboard key={`${x}:${z}`} position={[x, height / 2 - 0.2, z]} lockX lockZ>
          <mesh>
            <planeGeometry args={[1.1, height]} />
            <shaderMaterial
              ref={(material) => {
                if (!material) return;
                flames.add(material);
                return () => flames.delete(material);
              }}
              vertexShader={FLAME_VERTEX}
              fragmentShader={FLAME_FRAGMENT}
              uniforms={{ uTime: { value: 0 }, uOpacity: { value: 0 } }}
              transparent
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}
