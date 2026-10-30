"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, UniformsLib, UniformsUtils, Vector2, Vector3, type ShaderMaterial } from "three";
import { blendRealm, SKY, useRealmMix } from "../realm/RealmAtmosphere";
import { NOISE_GLSL } from "../realm/noise";

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

const VERTEX = /* glsl */ `
  #include <fog_pars_vertex>
  uniform float uTime;
  uniform float uCelestial;
  varying vec3 vWorld;

  float swell(vec2 p) {
    return sin(dot(p, vec2(0.8, 0.6)) * 0.35 + uTime * 0.7) * 0.12
         + sin(dot(p, vec2(-0.5, 0.9)) * 0.5 + uTime * 0.9) * 0.07;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // Lava heaves slowly and low; the cloud sea barely moves.
    world.y += swell(world.xz) * (1.0 - uCelestial * 0.7);
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
  uniform float uShoreCenterZ;
  uniform float uCelestial;
  uniform vec3 uHorizon;
  varying vec3 vWorld;

  ${NOISE_GLSL}

  /** A sea of clouds lit by the sun, tinted by the horizon at grazing angles. */
  vec3 clouds(vec2 p, float fresnel) {
    float fluff = fbm(p * 0.09 + vec2(uTime * 0.012, uTime * 0.008));
    float detail = fbm(p * 0.35 - vec2(uTime * 0.02, 0.0));
    vec3 shade = vec3(0.34, 0.38, 0.62);
    vec3 lit = vec3(0.86, 0.82, 0.8);
    vec3 color = mix(shade, lit, smoothstep(0.35, 0.75, fluff * 0.7 + detail * 0.3));
    return mix(color, uHorizon * 0.8, fresnel * 0.4);
  }

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

  /** Roughly how far out from the island's waterline (its rounded-rectangle shape, see islandTerrain). */
  float shoreDistance(vec2 p) {
    vec2 q = abs((p - vec2(0.0, uShoreCenterZ)) / uShoreHalf);
    float reach = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
    return (reach - 0.94) * min(uShoreHalf.x, uShoreHalf.y);
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

    float shore = shoreDistance(vWorld.xz);
    float bands = 0.5 + 0.5 * sin(shore * 7.0 - uTime * 2.2 + w.x * 12.0);
    // Breaking only along the outer coast: inland water (the stream) stays clear.
    float coast = smoothstep(-0.9, -0.2, shore);
    float foam = smoothstep(1.4, 0.0, shore) * smoothstep(0.75, 0.98, bands) * coast;
    foam = max(foam, smoothstep(0.2, 0.0, abs(shore)) * 0.6);
    color = mix(color, uFoam, clamp(foam, 0.0, 1.0) * 0.32);

    if (uCelestial > 0.001) color = mix(color, clouds(vWorld.xz, fresnel), uCelestial);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

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
    current.uniforms.uTime.value += delta;
    current.uniforms.uCelestial.value = realm.celestial;
    blendRealm(current.uniforms.uHorizon.value, SKY.mortal.horizon, SKY.infernal.horizon, SKY.celestial.horizon, realm);
    current.uniforms.uMoonPosition.value.set(...moonPosition);
    current.uniforms.uShoreHalf.value.set(...shoreHalfSize);
    current.uniforms.uShoreCenterZ.value = shoreCenterZ;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={level}>
      <planeGeometry args={[size, size, 160, 160]} />
      <shaderMaterial ref={material} vertexShader={VERTEX} fragmentShader={FRAGMENT} uniforms={uniforms} fog />
    </mesh>
  );
}
