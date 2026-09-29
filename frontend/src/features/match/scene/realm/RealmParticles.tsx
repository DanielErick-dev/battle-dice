"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, type ShaderMaterial } from "three";
import { seededRandom } from "@/game/domain/random";
import { useRealmMix, type RealmMix } from "./RealmAtmosphere";

const POINTS_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uRise;
  uniform float uSway;
  uniform float uSize;
  uniform float uFloor;
  uniform float uCeiling;
  uniform float uPixelRatio;
  varying float vSeed;
  varying float vHeight;

  void main() {
    vec3 p = position;
    float span = uCeiling - uFloor;
    // Each particle rises at its own pace and wraps back to the floor.
    p.y = uFloor + mod(p.y - uFloor + uTime * uRise * (0.5 + aSeed), span);
    p.x += sin(uTime * 0.8 + aSeed * 12.0) * uSway;
    p.z += cos(uTime * 0.6 + aSeed * 9.0) * uSway;
    vSeed = aSeed;
    vHeight = (p.y - uFloor) / span;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFlicker;
  varying float vSeed;
  varying float vHeight;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * 9.0 + vSeed * 40.0), uFlicker);
    // Fade in near the floor and out near the ceiling so the wrap never pops.
    float life = smoothstep(0.0, 0.12, vHeight) * smoothstep(1.0, 0.7, vHeight);
    gl_FragColor = vec4(uColor * soft * flicker, soft * life * uOpacity);
  }
`;

interface DriftProps {
  realm: keyof RealmMix;
  count: number;
  radius: number;
  floor: number;
  ceiling: number;
  color: Color;
  size: number;
  rise: number;
  sway: number;
  flicker: number;
  seed: number;
}

/** A cloud of glowing particles rising through the arena while its realm is showing. */
function Drift({ realm, count, radius, floor, ceiling, color, size, rise, sway, flicker, seed }: DriftProps) {
  const mix = useRealmMix();
  const material = useRef<ShaderMaterial>(null);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => {
    const random = seededRandom(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * radius;
      positions.set([Math.cos(angle) * distance, floor + random() * (ceiling - floor), Math.sin(angle) * distance], i * 3);
      seeds[i] = random();
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    return result;
  }, [count, radius, floor, ceiling, seed]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRise: { value: rise },
      uSway: { value: sway },
      uSize: { value: size },
      uFloor: { value: floor },
      uCeiling: { value: ceiling },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: color },
      uOpacity: { value: 0 },
      uFlicker: { value: flicker },
    }),
    [rise, sway, size, floor, ceiling, pixelRatio, color, flicker],
  );

  useFrame((_, delta) => {
    const current = material.current;
    if (!current) return;
    const amount = mix.current[realm];
    current.visible = amount > 0.01;
    current.uniforms.uTime.value += delta;
    current.uniforms.uOpacity.value = amount;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={POINTS_VERTEX}
        fragmentShader={POINTS_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

const SHAFT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SHAFT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    // Soft at the cone's silhouette, fading towards the ground, with slow shimmering streaks.
    float facing = abs(dot(vNormalView, vViewDir));
    float streaks = 0.7 + 0.3 * sin(vUv.x * 40.0 + uTime * 0.6) * sin(vUv.x * 17.0 - uTime * 0.4);
    float alpha = pow(facing, 2.0) * smoothstep(0.0, 0.45, vUv.y) * streaks * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Beams of sunlight slanting down through the clouds while the celestial realm shows. */
function LightShafts({ radius }: { radius: number }) {
  const mix = useRealmMix();
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const shafts = useMemo(() => {
    const random = seededRandom(91);
    return Array.from({ length: 7 }, (_, i) => {
      const angle = (i / 7) * Math.PI * 2 + random() * 0.5;
      const distance = radius * (0.35 + random() * 0.55);
      return {
        position: [Math.cos(angle) * distance, 14, Math.sin(angle) * distance] as [number, number, number],
        tilt: [0.18 * Math.sin(angle), 0, 0.18 * Math.cos(angle)] as [number, number, number],
        width: 1.8 + random() * 2.2,
      };
    });
  }, [radius]);
  const uniforms = useMemo(
    () => shafts.map(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color("#fff0c4") } })),
    [shafts],
  );

  useFrame(({ clock }) => {
    const amount = mix.current.celestial;
    materials.current.forEach((material, i) => {
      if (!material) return;
      material.visible = amount > 0.01;
      material.uniforms.uOpacity.value = amount * (0.16 + 0.06 * Math.sin(clock.elapsedTime * 0.5 + i));
      material.uniforms.uTime.value = clock.elapsedTime;
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

const EMBER_COLOR = new Color(3.2, 0.9, 0.2);
const MOTE_COLOR = new Color(2.2, 1.9, 1.2);

/** Embers rising from the lava, or motes of light and sunbeams, around the whole arena. */
export function RealmParticles({ radius }: { radius: number }) {
  return (
    <>
      <Drift realm="infernal" count={900} radius={radius} floor={-1} ceiling={14} color={EMBER_COLOR} size={1.6} rise={1.4} sway={0.5} flicker={1} seed={7} />
      <Drift realm="celestial" count={600} radius={radius} floor={-0.5} ceiling={18} color={MOTE_COLOR} size={1.3} rise={0.35} sway={0.9} flicker={0.3} seed={13} />
      <LightShafts radius={radius * 0.6} />
    </>
  );
}
