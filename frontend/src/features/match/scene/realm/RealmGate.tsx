"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, type Group, type ShaderMaterial } from "three";
import type { RealmKind } from "@/game/domain/types";
import { TILE_HEIGHT, type Vec3 } from "../boardLayout";
import { NOISE_GLSL } from "./noise";

const UV_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Hellfire whirling up a funnel: noise scrolled around and up the walls. */
const FIRE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 p = vec2(vUv.x * 7.0 + uTime * 1.6 + vUv.y * 4.0, vUv.y * 2.6 - uTime * 2.4);
    float n = fbm(p);
    float flame = smoothstep(0.32, 0.82, n + (1.0 - vUv.y) * 0.4);
    vec3 cool = vec3(0.7, 0.05, 0.0);
    vec3 hot = vec3(2.4, 0.75, 0.1);
    vec3 color = mix(cool, hot, flame * flame);
    float alpha = flame * smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.06, vUv.y) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** The mouth of the tunnel on the tile: a dark swirling pit with a burning rim. */
const PIT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x);
    float swirl = fbm(vec2(angle * 1.6 + uTime * 1.3 + r * 4.0, r * 5.0 - uTime * 2.2));
    float rim = smoothstep(0.28, 0.0, abs(r - 0.82 - swirl * 0.1));
    float depth = smoothstep(0.85, 0.1, r);
    vec3 abyss = mix(vec3(0.5, 0.04, 0.0) * swirl * 2.0, vec3(0.02, 0.0, 0.0), depth);
    vec3 color = abyss + vec3(3.6, 1.1, 0.15) * rim * (0.6 + swirl);
    gl_FragColor = vec4(color, uOpacity * smoothstep(1.0, 0.9, r));
  }
`;

/** A pillar of light pouring down from the sky, streaked and shimmering. */
const PILLAR_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float streaks = 0.55 + 0.45 * sin(vUv.x * 55.0 + sin(vUv.y * 6.0 - uTime * 3.0) * 2.0);
    float flow = 0.7 + 0.3 * sin(vUv.y * 30.0 + uTime * 8.0);
    float ends = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.3, vUv.y);
    vec3 color = vec3(2.6, 2.3, 1.6) * streaks * flow;
    gl_FragColor = vec4(color, ends * streaks * uOpacity * 0.8);
  }
`;

/** A glowing rune circle on the tile under the pillar. */
const SEAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x) + uTime * 0.6;
    float rings = smoothstep(0.035, 0.0, abs(r - 0.92)) + smoothstep(0.03, 0.0, abs(r - 0.7));
    float runes = step(0.72, r) * step(r, 0.9) * step(0.5, fract(angle * 3.8197)) * 0.6;
    float star = smoothstep(0.05, 0.0, abs(r * cos(mod(angle, 1.0472) - 0.5236) - 0.45)) * step(r, 0.7);
    float core = smoothstep(0.6, 0.0, r) * 0.5;
    vec3 color = vec3(2.8, 2.2, 1.1) * (rings + runes + star + core);
    gl_FragColor = vec4(color, clamp(rings + runes + star + core, 0.0, 1.0) * uOpacity);
  }
`;

const OPEN_SECONDS = 0.45;
const HOLD_SECONDS = 2.2;
const CLOSE_SECONDS = 0.8;

/** 0→1 while opening, 1 while held, 1→0 while closing. */
function gateStrength(age: number): number {
  if (age < OPEN_SECONDS) return age / OPEN_SECONDS;
  if (age < HOLD_SECONDS) return 1;
  return Math.max(0, 1 - (age - HOLD_SECONDS) / CLOSE_SECONDS);
}

interface RealmGateProps {
  realm: RealmKind;
  /** The portal tile the gate opens on. */
  position: Vec3;
}

/**
 * The portal tearing open into a realm (mount with a fresh key per entry). Infernal: a pit
 * opens in the tile and hellfire whirls up out of it. Celestial: a pillar of light pours down
 * from the sky onto a glowing seal.
 */
export function RealmGate({ realm, position }: RealmGateProps) {
  const born = useRef<number | null>(null);
  const group = useRef<Group>(null);
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const uniforms = useMemo(() => [0, 1].map(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } })), []);

  useFrame(({ clock }, delta) => {
    born.current ??= clock.elapsedTime;
    const age = clock.elapsedTime - born.current;
    const strength = gateStrength(age);
    materials.current.forEach((material) => {
      if (!material) return;
      material.uniforms.uTime.value += delta;
      material.uniforms.uOpacity.value = strength;
    });
    if (group.current) {
      group.current.visible = strength > 0.001;
      const grow = 0.2 + 0.8 * Math.min(1, age / OPEN_SECONDS);
      group.current.scale.set(grow, 1, grow);
    }
  });

  const top = TILE_HEIGHT / 2 + 0.02;
  const register = (i: number) => (material: ShaderMaterial | null) => {
    materials.current[i] = material;
  };

  return (
    <group position={position}>
      <group ref={group}>
        {realm === "infernal" ? (
          <>
            <mesh rotation-x={-Math.PI / 2} position-y={top + 0.01}>
              <circleGeometry args={[1.05, 64]} />
              <shaderMaterial
                ref={register(0)}
                vertexShader={UV_VERTEX}
                fragmentShader={PIT_FRAGMENT}
                uniforms={uniforms[0]}
                transparent
                depthWrite={false}
              />
            </mesh>
            <mesh position-y={top + 2.1}>
              <cylinderGeometry args={[1.7, 0.75, 4.2, 48, 1, true]} />
              <shaderMaterial
                ref={register(1)}
                vertexShader={UV_VERTEX}
                fragmentShader={FIRE_FRAGMENT}
                uniforms={uniforms[1]}
                transparent
                depthWrite={false}
                side={DoubleSide}
                blending={AdditiveBlending}
              />
            </mesh>
            <Sparkles count={60} scale={[2.6, 5, 2.6]} position-y={2.4} size={6} speed={2.4} color="#ff7a2a" />
          </>
        ) : (
          <>
            <mesh rotation-x={-Math.PI / 2} position-y={top + 0.01}>
              <circleGeometry args={[1.15, 64]} />
              <shaderMaterial
                ref={register(0)}
                vertexShader={UV_VERTEX}
                fragmentShader={SEAL_FRAGMENT}
                uniforms={uniforms[0]}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
              />
            </mesh>
            <mesh position-y={top + 15}>
              <cylinderGeometry args={[1.25, 0.95, 30, 48, 1, true]} />
              <shaderMaterial
                ref={register(1)}
                vertexShader={UV_VERTEX}
                fragmentShader={PILLAR_FRAGMENT}
                uniforms={uniforms[1]}
                transparent
                depthWrite={false}
                side={DoubleSide}
                blending={AdditiveBlending}
              />
            </mesh>
            <Sparkles count={70} scale={[2.2, 7, 2.2]} position-y={3} size={5} speed={1.2} color="#fff1b8" />
          </>
        )}
      </group>
    </group>
  );
}
