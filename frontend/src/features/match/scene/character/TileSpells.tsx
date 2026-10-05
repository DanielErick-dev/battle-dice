"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  ShaderMaterial,
  SRGBColorSpace,
  type Group,
} from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { NOISE_GLSL } from "../realm/noise";
import { useAge } from "../useAge";

const TILE_TOP = TILE_HEIGHT / 2;

/** The snow cover: a slab a little thicker than a lifted tile rises, so nothing of the tile shows. */
const COVER_HEIGHT = 0.12;
const COVER_Y = COVER_HEIGHT / 2 - 0.02;

/** Drifts heaped on the snow, where the trap's spikes stood: where (shares of the tile), how big. */
const DRIFTS = [
  { x: -0.2, z: 0.03, radius: 0.2 },
  { x: 0.02, z: -0.06, radius: 0.24 },
  { x: 0.2, z: 0.03, radius: 0.19 },
  { x: 0.12, z: -0.26, radius: 0.16 },
  { x: -0.24, z: -0.26, radius: 0.14 },
  { x: -0.06, z: 0.28, radius: 0.15 },
];
/** Ice crystals poking out of the snow: where, how tall, how far turned. */
const CRYSTALS = [
  { x: -0.32, z: 0.3, height: 0.26, turn: 0.3 },
  { x: 0.32, z: 0.24, height: 0.2, turn: 1.2 },
];

/**
 * A tile the Crystal Fairy enchanted: buried for good under fresh snow, a smooth white slab with
 * drifts heaped where the spikes were and a couple of ice crystals, so nothing of what it was
 * shows. Fairy dust glitters over it in her colour. Snows in as it's enchanted.
 */
export function EnchantedTileMark({ position, color }: { position: Vec3; color: string }) {
  const root = useRef<Group>(null);
  const snow = useSnowTexture();
  const glow = useMemo(() => new Color(color).multiplyScalar(1.4), [color]);
  const age = useAge();

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    root.current?.scale.set(1, Math.min(1, 0.05 + t * 1.6), 1);
    root.current?.children.forEach((child) => {
      if (child.userData.crystal) child.rotation.y += 0.004;
    });
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <RoundedBox
        args={[TILE_SIZE * 1.02, COVER_HEIGHT, TILE_SIZE * 1.02]}
        radius={0.05}
        smoothness={3}
        position-y={COVER_Y}
        receiveShadow
      >
        <meshStandardMaterial color="#f4fbff" map={snow} roughness={0.95} emissive="#9fd8ff" emissiveIntensity={0.12} />
      </RoundedBox>
      {DRIFTS.map(({ x, z, radius }) => (
        <mesh
          key={`${x}:${z}`}
          position={[x * TILE_SIZE, COVER_HEIGHT - 0.03, z * TILE_SIZE]}
          scale={[radius * TILE_SIZE, radius * 0.9, radius * TILE_SIZE]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f8fdff" map={snow} roughness={0.9} emissive="#9fd8ff" emissiveIntensity={0.1} />
        </mesh>
      ))}
      {CRYSTALS.map(({ x, z, height, turn }) => (
        <mesh
          key={`${x}:${z}`}
          userData={{ crystal: true }}
          position={[x * TILE_SIZE, COVER_HEIGHT + height * 0.35, z * TILE_SIZE]}
          rotation-y={turn}
          scale={[0.08, height, 0.08]}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#e0fbff"
            emissive={glow}
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <Sparkles
        count={14}
        scale={[TILE_SIZE * 0.9, 0.8, TILE_SIZE * 0.9]}
        position-y={0.45}
        size={2.5}
        speed={0.3}
        color="#e0f7ff"
      />
    </group>
  );
}

/** Fresh snow: white with soft blue hollows and a scatter of glints. */
function useSnowTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#f6fbff";
    context.fillRect(0, 0, size, size);
    // Soft hollows where the snow lies thinner.
    let seed = 11;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let hollow = 0; hollow < 40; hollow++) {
      const [x, y, r] = [random() * size, random() * size, 10 + random() * 34];
      const shade = context.createRadialGradient(x, y, 0, x, y, r);
      shade.addColorStop(0, "rgba(160,200,235,0.22)");
      shade.addColorStop(1, "rgba(160,200,235,0)");
      context.fillStyle = shade;
      context.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let glint = 0; glint < 160; glint++) {
      context.fillStyle = `rgba(255,255,255,${0.5 + random() * 0.5})`;
      context.fillRect(random() * size, random() * size, 1.5, 1.5);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const FLAME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A tongue of black fire: a flame shape licked into shape by rising noise, swaying, its heart
 * pitch black and its edges glowing like embers in the owner's colour.
 */
const FLAME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uRim;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    float t = uTime * 1.6 + uSeed;
    float rise = vUv.y;
    float licks = fbm(vec2(vUv.x * 3.0 + uSeed, rise * 2.5 - t * 1.8));
    float sway = (fbm(vec2(rise * 1.5 - t * 0.7, uSeed)) - 0.5) * 0.35 * rise;
    float across = abs(vUv.x - 0.5 - sway);
    float width = mix(0.42, 0.02, pow(rise, 0.9));
    float body = 1.0 - smoothstep(width * 0.55, width, across + (licks - 0.5) * 0.22);
    float top = 1.0 - smoothstep(0.5, 1.0, rise + (licks - 0.5) * 0.5);
    float shape = body * top * smoothstep(0.0, 0.06, rise);
    if (shape < 0.02) discard;
    float edge = 1.0 - smoothstep(0.0, 0.4, body * top);
    vec3 color = mix(vec3(0.012, 0.0, 0.02), uRim * 2.4, edge);
    gl_FragColor = vec4(color, shape * 0.95);
  }
`;

/**
 * Flames on a burning tile: a dense carpet of low tongues from edge to edge (a jittered 4×4 grid,
 * shares of the tile), each with its height, width and a seed for its flicker, so the whole tile
 * reads as fire rather than one tall flame.
 */
const FLAMES = Array.from({ length: 16 }, (_, index) => {
  const [column, row] = [index % 4, Math.floor(index / 4)];
  const jitter = (n: number) => (((Math.sin(index * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  return {
    x: (column - 1.5) * 0.24 + (jitter(1) - 0.5) * 0.08,
    z: (row - 1.5) * 0.24 + (jitter(2) - 0.5) * 0.08,
    height: 0.75 + jitter(3) * 0.45,
    width: 0.62 + jitter(4) * 0.2,
    seed: jitter(5) * 20,
  };
});
/** Shader materials the flames share (each with its own seed), so the carpet doesn't flicker in step. */
const FLAME_SEEDS = [0.3, 4.1, 7.7, 11.9];
/** The clock every black fire flickers to (one for all of them, set as the scene draws). */
const FLAME_TIME = { value: 0 };
/** Each flame is drawn on two planes crossed round the vertical, so it reads from any side. */
const CROSSINGS = [Math.PI / 4, (3 * Math.PI) / 4];

/**
 * A tile under the Kunoichi's black fire (Amaterasu): the tile is gone under a charred, smouldering
 * slab, and a carpet of pitch-black flames with ember edges burns over all of it, sparks rising
 * off them. Flares up as it's lit.
 */
export function BlackFlameMark({ position, color }: { position: Vec3; color: string }) {
  const root = useRef<Group>(null);
  const age = useAge();
  const rim = useMemo(() => new Color(color), [color]);
  const embers = useEmberTexture();
  const materials = useMemo(
    () => ({
      flames: FLAME_SEEDS.map(
        (seed) =>
          new ShaderMaterial({
            vertexShader: FLAME_VERTEX,
            fragmentShader: FLAME_FRAGMENT,
            uniforms: { uTime: FLAME_TIME, uSeed: { value: seed }, uRim: { value: rim } },
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
            toneMapped: false,
          }),
      ),
      glow: new MeshBasicMaterial({
        color: rim.clone().multiplyScalar(1.3),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [rim],
  );
  useEffect(() => () => [...materials.flames, materials.glow].forEach((material) => material.dispose()), [materials]);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    root.current?.scale.set(1, Math.min(1, 0.1 + t * 2.5), 1);
    FLAME_TIME.value = clock.elapsedTime;
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <RoundedBox
        args={[TILE_SIZE * 1.02, COVER_HEIGHT, TILE_SIZE * 1.02]}
        radius={0.05}
        smoothness={3}
        position-y={COVER_Y}
      >
        <meshStandardMaterial
          color="#0b0507"
          map={embers}
          emissive={rim}
          emissiveMap={embers}
          emissiveIntensity={1.4}
          roughness={1}
        />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position-y={COVER_HEIGHT - 0.01} material={materials.glow}>
        <planeGeometry args={[TILE_SIZE * 1.15, TILE_SIZE * 1.15]} />
      </mesh>
      {FLAMES.map(({ x, z, height, width }, index) => (
        <group key={index} position={[x * TILE_SIZE, COVER_HEIGHT - 0.04 + height / 2, z * TILE_SIZE]}>
          {CROSSINGS.map((turn) => (
            <mesh key={turn} rotation-y={turn + index} material={materials.flames[index % FLAME_SEEDS.length]}>
              <planeGeometry args={[width, height]} />
            </mesh>
          ))}
        </group>
      ))}
      <Sparkles
        count={18}
        scale={[TILE_SIZE * 0.9, 1.6, TILE_SIZE * 0.9]}
        position-y={0.9}
        size={3}
        speed={1.2}
        color={color}
      />
    </group>
  );
}

/** Charred ground with glowing cracks: black where it's dark, white along the embers (tinted by the emissive). */
function useEmberTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#050203";
    context.fillRect(0, 0, size, size);
    let seed = 29;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    context.lineCap = "round";
    for (let crack = 0; crack < 26; crack++) {
      let [x, y] = [random() * size, random() * size];
      context.strokeStyle = `rgba(255,255,255,${0.35 + random() * 0.5})`;
      context.lineWidth = 1 + random() * 2.5;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < 5; step++) {
        x += (random() - 0.5) * 50;
        y += (random() - 0.5) * 50;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
