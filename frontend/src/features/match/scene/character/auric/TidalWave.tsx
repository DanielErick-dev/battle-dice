"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  Vector3,
  type Group,
  type MeshBasicMaterial,
  type Points,
  type PointsMaterial,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { DEFAULT_TIMINGS } from "../../../config";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { useSoftDisc } from "../shared/softDisc";

/** How long the wave takes to rise, to roll along the whole reach, and to break at its end. */
const RISE_SECONDS = 0.3;
const TRAVEL_SECONDS = DEFAULT_TIMINGS.tideMs / 1000 - 0.6;
const BREAK_SECONDS = 0.45;
/** The wave: as wide as almost two tiles, taller than a figure. */
const WAVE_WIDTH = TILE_SIZE * 1.8;
const WAVE_HEIGHT = 2.3;
/** Grid of the wave's surface: across its width, and along its profile from the back to the lip. */
const ACROSS = 36;
const ALONG = 56;
/**
 * The breaking wave's profile, `[forward, up]`: a long gentle back, a steep face, the crest, and
 * the lip pitching forward and curling down over the trough. Heights are relative (1 = the crest).
 */
const PROFILE: readonly [number, number][] = [
  [-2.3, 0],
  [-1.5, 0.14],
  [-0.8, 0.45],
  [-0.25, 0.86],
  [0.12, 1],
  [0.5, 0.92],
  [0.78, 0.68],
  [0.74, 0.44],
  [0.56, 0.34],
];
/** How long a tile stays glistening once the wave has rolled over it. */
const WET_SECONDS = 1.8;
/** Spray torn off the lip, and the mist hanging over it. */
const SPRAY_COUNT = 160;
const SPRAY_SECONDS = 0.8;

const TILE_TOP = TILE_HEIGHT / 2;

const NOISE = /* glsl */ `
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
`;

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uCurl;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vec3 p = position;
    float s = uv.y;
    // Swells running across the face, stronger towards the crest.
    p.y += sin(p.x * 2.6 + uTime * 5.0 + s * 6.0) * 0.05 * s;
    p.z += sin(p.x * 1.7 - uTime * 3.2) * 0.06 * s;
    // The lip pitches further forward and down as the wave builds and breaks.
    float lip = smoothstep(0.6, 1.0, s);
    p.z += lip * uCurl * 0.35;
    p.y -= lip * uCurl * 0.25;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * Water: deep and dark at the foot, thinning to a lit turquoise up the face where the light comes
 * through, the sky caught at grazing angles and a glint of sun; foam on the curling lip, in streaks
 * pouring down the face and churning at the foot. Kept under 1.0 so the bloom leaves it alone.
 */
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  ${NOISE}
  void main() {
    float s = vUv.y;
    float u = vUv.x;
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vViewW);
    float fres = pow(1.0 - abs(dot(n, v)), 3.0);

    float thin = smoothstep(0.4, 0.88, s);
    vec3 color = mix(uDeep, uShallow, thin * 0.85);
    color += vec3(0.5, 0.7, 0.85) * fres * 0.35;
    vec3 sun = normalize(vec3(0.35, 0.85, 0.4));
    float glint = pow(max(dot(reflect(-v, n), sun), 0.0), 48.0);
    color += vec3(0.9) * glint * 0.55;

    float streaks = noise(vec2(u * 26.0, s * 5.0 - uTime * 1.8));
    float lipFoam = smoothstep(0.8, 0.93, s) * (0.65 + 0.35 * noise(vec2(u * 34.0 + uTime * 2.0, s * 12.0)));
    float faceFoam = smoothstep(0.64, 0.82, streaks) * smoothstep(0.35, 0.8, s) * 0.75;
    float footFoam = (1.0 - smoothstep(0.0, 0.14, s)) * (0.45 + 0.55 * noise(vec2(u * 20.0 - uTime * 2.5, uTime * 1.3)));
    float foam = clamp(lipFoam + faceFoam + footFoam, 0.0, 1.0);
    color = mix(color, vec3(0.93, 0.97, 0.99), foam);

    float edge = smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.9, u);
    float alpha = mix(0.8 + fres * 0.15, 0.97, foam) * edge * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Cleansing Tide, in world space: a breaking wave rises on the player's tile and rolls over the
 * tiles ahead (`path`, the player's own first), spray torn off its lip and mist over it, every tile
 * it crosses left glistening wet, and at the end of its reach it breaks in a burst of spray. Timed
 * like the playback (DEFAULT_TIMINGS.tideMs); mounted with a fresh key per wave, it fades itself
 * out. The water takes a touch of the caster's colour. No lights: the shader paints its own.
 */
export function TidalWave({ path, color }: { path: readonly Vec3[]; color: string }) {
  const crest = useRef<Group>(null);
  const surface = useRef<{ material: ShaderMaterial } | null>(null);
  const wet = useRef<(MeshBasicMaterial | null)[]>([]);
  const spray = useRef<Points>(null);
  const sprayMaterial = useRef<PointsMaterial>(null);
  /** The heading the wave faces, eased round the board's corners instead of snapping. */
  const heading = useRef<number | null>(null);
  const disc = useSoftDisc();
  const age = useAge();
  const geometry = useMemo(() => waveGeometry(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uCurl: { value: 0 },
          uOpacity: { value: 0 },
          uDeep: { value: new Color("#06283f").lerp(new Color(color), 0.12) },
          uShallow: {
            value: new Color("#2fb8c9").lerp(new Color(color), 0.15),
          },
        },
        transparent: true,
        side: DoubleSide,
      }),
    [color],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Seeds for the spray: where across the lip each drop leaves, how high and far it flies, and when.
  const drops = useMemo(() => {
    const random = seededRandom(path.length * 17 + 3);
    return Array.from({ length: SPRAY_COUNT }, () => ({
      across: (random() - 0.5) * WAVE_WIDTH * 0.9,
      lift: 1.2 + random() * 2.4,
      ahead: 0.3 + random() * 1.6,
      phase: random(),
    }));
  }, [path.length]);
  const sprayGeometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(new Float32Array(SPRAY_COUNT * 3), 3));
    return result;
  }, []);
  useEffect(() => () => sprayGeometry.dispose(), [sprayGeometry]);

  useFrame(({ clock }, delta) => {
    const t = age(clock.elapsedTime);
    const last = path.length - 1;
    // Where along the path the crest is (in tiles), and which way it rolls there.
    const along = Math.min(1, Math.max(0, (t - RISE_SECONDS) / TRAVEL_SECONDS)) * last;
    const index = Math.min(last - 1, Math.floor(along));
    const from = path[Math.max(0, index)];
    const to = path[Math.min(last, index + 1)] ?? from;
    const f = last === 0 ? 0 : along - index;
    const x = from[0] + (to[0] - from[0]) * f;
    const y = from[1] + (to[1] - from[1]) * f + TILE_TOP;
    const z = from[2] + (to[2] - from[2]) * f;
    const target = Math.atan2(to[0] - from[0], to[2] - from[2]);
    if (heading.current === null) heading.current = target;
    const turn = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
    heading.current += turn * Math.min(1, delta * 6);
    const facing = heading.current;

    const rise = Math.min(1, t / RISE_SECONDS);
    const end = RISE_SECONDS + TRAVEL_SECONDS;
    const breaking = Math.max(0, Math.min(1, (t - end) / BREAK_SECONDS));
    // It builds as it rolls, then the lip throws forward and the whole wave collapses.
    const height = rise * (1 - breaking ** 1.5);
    if (crest.current) {
      crest.current.visible = height > 0.01;
      crest.current.position.set(x, y, z);
      crest.current.rotation.y = facing;
      crest.current.scale.set(1, Math.max(0.01, height), Math.max(0.01, 0.6 + 0.4 * height));
    }
    const shader = surface.current?.material;
    if (shader) {
      shader.uniforms.uTime.value = t;
      shader.uniforms.uCurl.value = 0.3 + 0.4 * Math.min(1, t / end) + breaking * 0.8;
      shader.uniforms.uOpacity.value = Math.min(1, rise * 1.5) * (1 - breaking);
    }

    // Tiles glisten as the wave goes over them.
    path.forEach((_, tile) => {
      const wetMaterial = wet.current[tile];
      if (!wetMaterial) return;
      const since = ((t - RISE_SECONDS) / TRAVEL_SECONDS) * last - tile;
      const wetness = since < 0 ? 0 : Math.max(0, 1 - (since * TRAVEL_SECONDS) / Math.max(1, last) / WET_SECONDS);
      wetMaterial.opacity = 0.32 * wetness;
    });

    // Spray: each drop tears off the lip, flies up and ahead and falls away, over and over while it
    // rolls; the break throws it higher, all at once.
    const positions = sprayGeometry.getAttribute("position") as BufferAttribute;
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    const lipUp = WAVE_HEIGHT * 0.85 * height;
    const burst = 1 + breaking * 1.6;
    drops.forEach((drop, i) => {
      const life = (t / SPRAY_SECONDS + drop.phase) % 1;
      const up = lipUp + drop.lift * burst * life - 4.8 * life * life;
      const ahead = 0.7 + drop.ahead * life;
      // The wave's own frame: `across` sideways, `ahead` along the heading.
      positions.setXYZ(
        i,
        x + drop.across * cos + ahead * sin,
        y + Math.max(0, up),
        z - drop.across * sin + ahead * cos,
      );
    });
    positions.needsUpdate = true;
    sprayMaterial.current?.setValues({
      opacity: 0.75 * Math.min(1, rise * 2) * (1 - breaking * 0.6),
    });
    if (spray.current) spray.current.visible = t < end + BREAK_SECONDS;
  });

  return (
    <group>
      <group ref={crest}>
        <mesh
          ref={(mesh) => {
            surface.current = mesh as { material: ShaderMaterial } | null;
          }}
          geometry={geometry}
          material={material}
          renderOrder={3}
        />
      </group>
      <points ref={spray} geometry={sprayGeometry} frustumCulled={false} renderOrder={4}>
        <pointsMaterial
          ref={sprayMaterial}
          map={disc}
          color="#eef8ff"
          size={0.13}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
      {path.map(([px, py, pz], tile) => (
        <mesh key={tile} rotation-x={-Math.PI / 2} position={[px, py + TILE_TOP + 0.03, pz]}>
          <planeGeometry args={[TILE_SIZE * 0.92, TILE_SIZE * 0.92]} />
          <meshBasicMaterial
            ref={(wetMaterial) => {
              wet.current[tile] = wetMaterial;
            }}
            color="#7dd3fc"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The wave's surface: PROFILE swept across its width (`uv.x` across, `uv.y` from the back to the
 * lip), lower and less curled towards its ends so it reads as a wave, not a pipe.
 */
function waveGeometry(): BufferGeometry {
  const curve = new CatmullRomCurve3(PROFILE.map(([forward, up]) => new Vector3(0, up, forward)));
  const samples = curve.getSpacedPoints(ALONG);
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i <= ACROSS; i++) {
    const u = i / ACROSS;
    const taper = 0.2 + 0.8 * Math.sin(u * Math.PI) ** 0.6;
    for (let j = 0; j <= ALONG; j++) {
      const point = samples[j];
      positions.push((u - 0.5) * WAVE_WIDTH, point.y * WAVE_HEIGHT * taper, point.z * (0.55 + 0.45 * taper));
      uvs.push(u, j / ALONG);
    }
  }
  const indices: number[] = [];
  const row = ALONG + 1;
  for (let i = 0; i < ACROSS; i++) {
    for (let j = 0; j < ALONG; j++) {
      const a = i * row + j;
      const b = (i + 1) * row + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const result = new BufferGeometry();
  result.setAttribute("position", new Float32BufferAttribute(positions, 3));
  result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}
