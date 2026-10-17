"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, DoubleSide, SRGBColorSpace, type Group, type MeshStandardMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { useAge } from "../useAge";
import { preloadProps, PROP_HEIGHT, usePropMesh } from "./props";
import { withRim, type RimUniforms } from "./rimGlow";

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

/** The clock every black fire flickers to (one for all of them, set as the scene draws). */
const FLAME_TIME = { value: 0 };
/** The fires on a burning tile: a tall one in the middle, two lower ones beside it (shares of the tile). */
const FIRES = [
  { x: 0, z: 0, height: 1.7, turn: 0 },
  // A ring of smaller fires out to the edges, so the whole tile burns.
  { x: -0.3, z: -0.3, height: 1.15, turn: 1.3 },
  { x: 0.3, z: -0.3, height: 1.05, turn: 2.9 },
  { x: -0.3, z: 0.3, height: 1.0, turn: 4.4 },
  { x: 0.3, z: 0.3, height: 1.2, turn: 5.6 },
  { x: 0, z: -0.34, height: 0.85, turn: 0.7 },
  { x: 0, z: 0.34, height: 0.9, turn: 3.6 },
  { x: -0.34, z: 0, height: 0.8, turn: 2.2 },
  { x: 0.34, z: 0, height: 0.85, turn: 5.0 },
];
/** The model's own height (PROP_HEIGHT), and how far its lowest point is below its middle. */
const FIRE_MODEL_BOTTOM = 0.95;

/**
 * Bends the black fire model as it burns: its tongues sway and lick, more the higher they are (the
 * base stays put), each part of it out of step with the rest.
 */
const FIRE_SWAY_GLSL = /* glsl */ `
  #include <begin_vertex>
  float flameRise = clamp((position.y + 0.95) / 1.85, 0.0, 1.0);
  float flameSway = flameRise * flameRise;
  transformed.x += sin(uFlameTime * 2.4 - position.y * 3.5 + position.z * 2.0) * 0.08 * flameSway;
  transformed.z += cos(uFlameTime * 2.1 - position.y * 3.0 + position.x * 2.5) * 0.08 * flameSway;
  transformed.y += sin(uFlameTime * 3.2 - position.y * 4.0 + position.x * 3.0) * 0.04 * flameSway;
`;

preloadProps(["blackFlame"]);

/**
 * Amaterasu's look, like Itachi's: pitch-black fire (FIRE_BODY), a faint ember glow inside it, and a
 * dark crimson burning along its edges.
 */
const FIRE_BODY = "#050104";
const FIRE_EMBER = "#ff3048";
const FIRE_EMBER_GLOW = 0.18;
const FIRE_RIM = "#c0102c";
const FIRE_RIM_STRENGTH = 1.6;

/** The black fire model's material, glowing red along its edges and bent by FIRE_SWAY_GLSL. */
function useFireMaterial(): MeshStandardMaterial {
  const { material } = usePropMesh("blackFlame");
  const fire = useMemo(() => {
    const copy = material.clone();
    copy.side = DoubleSide;
    // Amaterasu: the fire itself is black, its texture only a faint ember glow deep inside it…
    copy.color = new Color(FIRE_BODY);
    copy.emissive = new Color(FIRE_EMBER);
    copy.emissiveMap = copy.map;
    copy.emissiveIntensity = FIRE_EMBER_GLOW;
    copy.roughness = 1;
    // …and its edges burn a dark crimson.
    const rim: RimUniforms = { uRimColor: { value: new Color(FIRE_RIM) }, uRimStrength: { value: FIRE_RIM_STRENGTH } };
    copy.onBeforeCompile = (shader) => {
      shader.uniforms.uFlameTime = FLAME_TIME;
      Object.assign(shader.uniforms, rim);
      shader.vertexShader = `uniform float uFlameTime;\n${shader.vertexShader.replace("#include <begin_vertex>", FIRE_SWAY_GLSL)}`;
      shader.fragmentShader = withRim(shader.fragmentShader);
    };
    copy.customProgramCacheKey = () => "blackFlameSwayRim";
    return copy;
  }, [material]);
  useEffect(() => () => fire.dispose(), [fire]);
  return fire;
}

/**
 * A tile under the Kunoichi's black fire (Amaterasu): the tile is gone under a charred, smouldering
 * slab, and black flames edged in red burn all over it, swaying and breathing slowly (their height
 * and glow rise and fall), sparks rising off them. Flares up as it's lit.
 */
export function BlackFlameMark({ position, color }: { position: Vec3; color: string }) {
  const root = useRef<Group>(null);
  const fires = useRef<(Group | null)[]>([]);
  const age = useAge();
  const rim = useMemo(() => new Color(color), [color]);
  const embers = useEmberTexture();
  const { geometry } = usePropMesh("blackFlame");
  const fire = useFireMaterial();

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    const now = clock.elapsedTime;
    root.current?.scale.set(1, Math.min(1, 0.1 + t * 2.5), 1);
    FLAME_TIME.value = now;
    // Breathing: each fire rises and settles slowly, out of step with the others.
    fires.current.forEach((node, index) => {
      if (!node) return;
      const phase = now + index * 1.7;
      const jump = Math.sin(phase * 2.3) * 0.05 + Math.sin(phase * 3.9) * 0.025;
      node.scale.set(1 - jump * 0.3, 1 + jump, 1 - jump * 0.3);
    });
    fire.setValues({
      emissiveIntensity: FIRE_EMBER_GLOW * (1 + Math.sin(now * 2.6) * 0.25 + Math.sin(now * 4.1) * 0.15),
    });
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
          emissiveIntensity={0.45}
          roughness={1}
        />
      </RoundedBox>
      {FIRES.map(({ x, z, height, turn }, index) => (
        <group
          key={index}
          ref={(node) => {
            fires.current[index] = node;
          }}
          position={[x * TILE_SIZE, COVER_HEIGHT - 0.03, z * TILE_SIZE]}
          rotation-y={turn}
        >
          <mesh
            geometry={geometry}
            material={fire}
            scale={height / PROP_HEIGHT}
            position-y={(FIRE_MODEL_BOTTOM * height) / PROP_HEIGHT}
          />
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
