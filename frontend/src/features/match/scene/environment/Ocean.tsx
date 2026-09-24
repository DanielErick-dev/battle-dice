"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, UniformsLib, UniformsUtils, Vector2, Vector3, type ShaderMaterial } from "three";

interface OceanProps {
  /** Water surface height. */
  level: number;
  /** Side of the square water plane; should reach past the fog so the edge never shows. */
  size: number;
  /** Half extents of the arena base, where the foam breaks. */
  shoreHalfSize: [number, number];
  /** World position of the moon, for the glitter path on the water. */
  moonPosition: [number, number, number];
}

const VERTEX = /* glsl */ `
  #include <fog_pars_vertex>
  uniform float uTime;
  varying vec3 vWorld;

  float swell(vec2 p) {
    return sin(dot(p, vec2(0.8, 0.6)) * 0.35 + uTime * 0.7) * 0.12
         + sin(dot(p, vec2(-0.5, 0.9)) * 0.5 + uTime * 0.9) * 0.07;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    world.y += swell(world.xz);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uFoam;
  uniform vec3 uMoonColor;
  uniform vec3 uMoonPosition;
  uniform vec2 uShoreHalf;
  varying vec3 vWorld;

  // Sum of directional waves; returns (height, d/dx, d/dz).
  vec3 waves(vec2 p) {
    vec3 sum = vec3(0.0);
    vec4 dirs[6];
    dirs[0] = vec4(0.8, 0.6, 0.35, 0.7);
    dirs[1] = vec4(-0.5, 0.9, 0.5, 0.9);
    dirs[2] = vec4(0.2, -1.0, 1.3, 1.6);
    dirs[3] = vec4(-0.9, -0.4, 1.9, 2.1);
    dirs[4] = vec4(0.6, -0.8, 3.1, 2.7);
    dirs[5] = vec4(-0.3, 0.95, 4.3, 3.3);
    float amps[6] = float[6](0.12, 0.07, 0.035, 0.022, 0.012, 0.008);
    for (int i = 0; i < 6; i++) {
      vec2 d = normalize(dirs[i].xy);
      float k = dirs[i].z;
      float phase = dot(p, d) * k + uTime * dirs[i].w;
      sum.x += sin(phase) * amps[i];
      sum.yz += d * cos(phase) * amps[i] * k;
    }
    return sum;
  }

  float boxDistance(vec2 p, vec2 extent) {
    vec2 q = abs(p) - extent;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }

  void main() {
    vec3 w = waves(vWorld.xz);
    // Far away, small waves are finer than a pixel and alias into blotches: calm them down.
    float calm = 1.0 / (1.0 + distance(cameraPosition, vWorld) * 0.025);
    vec3 normal = normalize(vec3(-w.y * calm, 1.0, -w.z * calm));
    vec3 toCamera = normalize(cameraPosition - vWorld);

    float fresnel = pow(1.0 - max(dot(normal, toCamera), 0.0), 4.0);
    vec3 color = mix(uDeep, uShallow, smoothstep(-0.1, 0.18, w.x));
    color = mix(color, uSky, fresnel * 0.85);

    vec3 toMoon = normalize(uMoonPosition - vWorld);
    float glitter = pow(max(dot(reflect(-toMoon, normal), toCamera), 0.0), 260.0);
    color += uMoonColor * glitter * 0.9;

    float shore = boxDistance(vWorld.xz, uShoreHalf);
    float bands = 0.5 + 0.5 * sin(shore * 7.0 - uTime * 2.2 + w.x * 12.0);
    float foam = smoothstep(1.4, 0.0, shore) * smoothstep(0.7, 0.98, bands);
    foam = max(foam, smoothstep(0.25, 0.0, shore));
    color = mix(color, uFoam, clamp(foam, 0.0, 1.0) * 0.45);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Animated night sea: layered waves, sky reflection at grazing angles, moon glitter and shore foam. */
export function Ocean({ level, size, shoreHalfSize, moonPosition }: OceanProps) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () =>
      UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uDeep: { value: new Color("#041526") },
          uShallow: { value: new Color("#0b3a52") },
          uSky: { value: new Color("#3a2a6e") },
          uFoam: { value: new Color("#cfe8ff") },
          uMoonColor: { value: new Color("#fff4d6") },
          uMoonPosition: { value: new Vector3() },
          uShoreHalf: { value: new Vector2() },
        },
      ]),
    [],
  );

  useFrame((_, delta) => {
    const current = material.current;
    if (!current) return;
    current.uniforms.uTime.value += delta;
    current.uniforms.uMoonPosition.value.set(...moonPosition);
    current.uniforms.uShoreHalf.value.set(...shoreHalfSize);
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={level}>
      <planeGeometry args={[size, size, 160, 160]} />
      <shaderMaterial ref={material} vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} fog />
    </mesh>
  );
}
