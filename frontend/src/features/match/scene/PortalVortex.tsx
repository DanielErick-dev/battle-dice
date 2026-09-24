"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type ShaderMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE } from "./boardLayout";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x);

    // Logarithmic spiral arms drifting inwards over time.
    float spin = uTime * (1.5 + uEnergy * 3.0);
    float arms = sin(angle * 3.0 + log(r + 0.001) * 6.0 + spin);
    arms = smoothstep(0.35, 1.0, arms);
    float ripples = 0.5 + 0.5 * sin(angle * 9.0 - r * 18.0 + spin * 1.7);

    float body = arms * (0.7 + 0.3 * ripples) * smoothstep(1.0, 0.35, r) * smoothstep(0.12, 0.35, r);
    float rim = smoothstep(0.12, 0.0, abs(r - 0.9));
    float eventHorizon = smoothstep(0.05, 0.0, abs(r - 0.2));
    float core = smoothstep(0.32, 0.0, r);

    vec3 hot = mix(uColor, vec3(1.0), 0.45);
    vec3 color = uColor * body * (2.6 + uEnergy * 2.0) + hot * (rim * 1.6 + eventHorizon * 2.4);
    float alpha = clamp(0.35 + body + rim + eventHorizon + core, 0.0, 1.0) * smoothstep(1.0, 0.94, r);
    color = mix(color, vec3(0.0), core * (1.0 - eventHorizon));

    gl_FragColor = vec4(color, alpha);
  }
`;

const RADIUS = TILE_SIZE * 0.31;
/** How fast the vortex eases between idle and active energy (per second). */
const ENERGY_RATE = 4;

interface PortalVortexProps {
  color: string;
  /** A player is travelling through it right now. */
  active: boolean;
  /** Offsets the animation so neighbouring portals don't spin in lockstep. */
  phase: number;
}

/**
 * Swirling vortex over a portal tile. Colours go above 1.0 on purpose so the bloom pass
 * makes the arms and rim glow; `active` (a player is travelling through it) spins it up.
 */
export function PortalVortex({ color, active, phase }: PortalVortexProps) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: phase },
      uEnergy: { value: 0 },
      uColor: { value: new Color(color) },
    }),
    [color, phase],
  );

  useFrame((_, delta) => {
    const current = material.current;
    if (!current) return;
    current.uniforms.uTime.value += delta;
    const energy = current.uniforms.uEnergy;
    energy.value += ((active ? 1 : 0) - energy.value) * Math.min(1, delta * ENERGY_RATE);
  });

  return (
    <group position={[0, TILE_HEIGHT / 2 + 0.02, -0.17]}>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[RADIUS, 64]} />
        <shaderMaterial
          ref={material}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.005}>
        <circleGeometry args={[RADIUS * 1.35, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <Sparkles count={22} scale={[1.1, 1.3, 1.1]} position-y={0.55} size={3} speed={0.8} color={color} />
    </group>
  );
}
