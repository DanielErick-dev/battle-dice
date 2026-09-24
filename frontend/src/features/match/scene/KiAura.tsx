"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, type Mesh, type MeshBasicMaterial, type ShaderMaterial } from "three";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    // Tongues of energy scrolling upwards, wrapped seamlessly around the cylinder.
    vec2 p = vec2(vUv.x * 8.0, vUv.y * 3.0 - uTime * 2.6);
    float flames = noise(p) * 0.6 + noise(p * 2.3 + 4.0) * 0.4;
    float shape = smoothstep(0.0, 0.12, vUv.y) * pow(1.0 - vUv.y, 1.3);
    float body = smoothstep(0.35, 0.85, flames * shape * 1.8);

    vec3 color = mix(uColor, uCore, body * 0.6) * (1.1 + body * 0.9);
    gl_FragColor = vec4(color, body * uPower);
  }
`;

const HEIGHT = 2.3;
/** Per second: how fast the aura flares up and dies down. */
const FADE_RATE = 5;
const SHOCKWAVE_SECONDS = 0.6;
const SHOCKWAVE_COLOR = new Color("#ffd54a").multiplyScalar(2);

/**
 * Super-Saiyan style energy around a player: rising golden flames (bloom picks up their
 * above-1.0 colours), sparks, and a shockwave on the ground each time it ignites.
 */
export function KiAura({ active }: { active: boolean }) {
  const outer = useRef<ShaderMaterial>(null);
  const inner = useRef<ShaderMaterial>(null);
  const wave = useRef<Mesh>(null);
  const waveMaterial = useRef<MeshBasicMaterial>(null);
  const power = useRef(0);
  const ignitedAt = useRef<number | null>(null);
  const wasActive = useRef(false);

  const outerUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPower: { value: 0 },
      uColor: { value: new Color("#ffb300") },
      uCore: { value: new Color("#ffe08a") },
    }),
    [],
  );
  const innerUniforms = useMemo(
    () => ({
      uTime: { value: 3.7 },
      uPower: { value: 0 },
      uColor: { value: new Color("#ffc21a") },
      uCore: { value: new Color("#fff1b0") },
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    if (active && !wasActive.current) ignitedAt.current = clock.elapsedTime;
    wasActive.current = active;

    power.current += ((active ? 1 : 0) - power.current) * Math.min(1, delta * FADE_RATE);
    for (const [material, speed] of [
      [outer.current, 1],
      [inner.current, 1.4],
    ] as const) {
      if (!material) continue;
      material.uniforms.uTime.value += delta * speed;
      material.uniforms.uPower.value = power.current;
    }

    const since = ignitedAt.current === null ? Infinity : clock.elapsedTime - ignitedAt.current;
    const t = Math.min(1, since / SHOCKWAVE_SECONDS);
    if (wave.current && waveMaterial.current) {
      wave.current.visible = t < 1;
      wave.current.scale.setScalar(0.4 + t * 3);
      waveMaterial.current.opacity = (1 - t) * 0.9;
    }
  });

  return (
    <group>
      <mesh position-y={HEIGHT / 2} renderOrder={2}>
        <cylinderGeometry args={[0.6, 1.0, HEIGHT, 48, 1, true]} />
        <shaderMaterial
          ref={outer}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={outerUniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position-y={HEIGHT * 0.4} renderOrder={2}>
        <cylinderGeometry args={[0.42, 0.72, HEIGHT * 0.8, 32, 1, true]} />
        <shaderMaterial
          ref={inner}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>

      <mesh ref={wave} rotation-x={-Math.PI / 2} position-y={0.05} visible={false}>
        <ringGeometry args={[0.45, 0.6, 48]} />
        <meshBasicMaterial
          ref={waveMaterial}
          color={SHOCKWAVE_COLOR}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {active && (
        <Sparkles count={28} scale={[1.2, HEIGHT, 1.2]} position-y={HEIGHT / 2} size={4} speed={2.2} color="#ffd54a" />
      )}
    </group>
  );
}
