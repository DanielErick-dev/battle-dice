"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  type Group,
  type Mesh,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom, type RandomSource } from "@/game/domain/random";
import { GROUND_RADIUS, roughen } from "./sceneryKit";
import { withDressing, type GroundDressing } from "./groundDressing";
import { useCanvasTexture } from "./textures";

const FLOOR_RADIUS = 1;
const FISSURE = new Color("#a47bff").multiplyScalar(1.8);
const VOID_GLOW = "#7c3aed";
/** Slabs torn out of the ground, hanging behind him: `y` is the rest height, `size` the slab's width. */
const SHARDS = [
  { x: -0.74, z: -0.36, y: 0.5, size: 0.1 },
  { x: -0.5, z: -0.72, y: 1.02, size: 0.065 },
  { x: -0.2, z: -0.9, y: 0.32, size: 0.13 },
  { x: 0.24, z: -0.86, y: 0.78, size: 0.085 },
  { x: 0.56, z: -0.62, y: 0.42, size: 0.11 },
  { x: 0.78, z: -0.24, y: 1.12, size: 0.055 },
  { x: -0.82, z: 0.08, y: 0.22, size: 0.05 },
  { x: 0.05, z: -0.7, y: 1.38, size: 0.045 },
];
/** Chunks of obsidian still on the ground, half sunk. */
const RUBBLE = [
  { x: -0.6, z: -0.62, size: 0.08 },
  { x: 0.42, z: -0.82, size: 0.06 },
  { x: 0.74, z: 0.1, size: 0.05 },
  { x: -0.5, z: 0.42, size: 0.04 },
];
const SHARD_SHAPES = 3;

/**
 * The Void Knight's stage instead of the rune pedestal: cracked obsidian with violet fissures pulsing, slabs of
 * it floating behind him and a slow vortex of dark mist. Origin on the floor; glows are additive, not lights.
 */
export function VoidRift() {
  const obsidian = useCanvasTexture({ size: 512, draw: paintRiftFloor, fadeFrom: 0.5 });
  const fissures = useCanvasTexture({ size: 512, draw: paintFissures, fadeFrom: 0.5 });
  const veins = useCanvasTexture({ size: 512, draw: paintVeins, fadeFrom: 0.5 });
  const vortex = useCanvasTexture({ size: 256, draw: paintVortex });
  const disc = useSoftDisc();
  const materials = useMemo(() => {
    const glow = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    return {
      floor: new MeshStandardMaterial({
        map: obsidian,
        transparent: true,
        roughness: 0.22,
        metalness: 0.35,
        depthWrite: false,
      }),
      fissures: new MeshBasicMaterial({ map: fissures, color: FISSURE, ...glow }),
      veins: new MeshBasicMaterial({ map: veins, color: FISSURE, ...glow }),
      mist: new MeshBasicMaterial({
        map: vortex,
        color: "#05020b",
        opacity: 0.7,
        transparent: true,
        depthWrite: false,
      }),
      swirl: new MeshBasicMaterial({ map: vortex, color: VOID_GLOW, opacity: 0.22, ...glow }),
      rock: new MeshStandardMaterial({
        color: "#130e1d",
        roughness: 0.18,
        metalness: 0.4,
        emissive: "#2a1055",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      hold: new SpriteMaterial({ map: disc, color: VOID_GLOW, opacity: 0.35, ...glow }),
    };
  }, [obsidian, fissures, veins, vortex, disc]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const geometries = useMemo(() => {
    const random = seededRandom(31);
    return {
      shards: Array.from({ length: SHARD_SHAPES }, () => slabGeometry(random)),
      rubble: roughen(new DodecahedronGeometry(1, 0), random, 0.45),
    };
  }, []);
  useEffect(
    () => () => [...geometries.shards, geometries.rubble].forEach((geometry) => geometry.dispose()),
    [geometries],
  );
  const shards = useRef<(Group | null)[]>([]);
  const mist = useRef<Mesh>(null);
  const swirl = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    // Main rifts and their branches throb out of step, as if the light ran outwards along them.
    materials.fissures.setValues({ opacity: 0.62 + 0.3 * Math.sin(t * 1.6) + 0.05 * Math.sin(t * 7.3) });
    materials.veins.setValues({ opacity: 0.4 + 0.35 * Math.sin(t * 1.6 - 1.4) });
    if (mist.current) mist.current.rotation.z += delta * 0.12;
    if (swirl.current) swirl.current.rotation.z -= delta * 0.07;
    SHARDS.forEach(({ x, z, y }, index) => {
      const shard = shards.current[index];
      if (!shard) return;
      const sway = Math.sin(t * 0.23 + index * 1.7) * 0.06;
      const angle = Math.atan2(z, x) + sway;
      const radius = Math.hypot(x, z);
      shard.position.set(
        Math.cos(angle) * radius,
        y + Math.sin(t * 0.7 + index * 2.3) * 0.045,
        Math.sin(angle) * radius,
      );
      shard.rotation.y = t * (0.1 + (index % 3) * 0.05) * (index % 2 ? 1 : -1);
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh material={materials.veins} rotation-x={-Math.PI / 2} position-y={0.003}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      <mesh material={materials.fissures} rotation-x={-Math.PI / 2} position-y={0.004}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      <mesh ref={mist} material={materials.mist} rotation-x={-Math.PI / 2} position-y={0.012} renderOrder={2}>
        <planeGeometry args={[1.9, 1.9]} />
      </mesh>
      <mesh ref={swirl} material={materials.swirl} rotation-x={-Math.PI / 2} position-y={0.016} renderOrder={3}>
        <planeGeometry args={[2.1, 2.1]} />
      </mesh>
      {SHARDS.map(({ size }, index) => (
        <group
          key={index}
          ref={(group) => {
            shards.current[index] = group;
          }}
        >
          <mesh
            geometry={geometries.shards[index % SHARD_SHAPES]}
            material={materials.rock}
            rotation={[0.12 * (index % 3) - 0.1, 0, 0.1 * ((index % 4) - 1.5)]}
            scale={size}
          />
          <sprite material={materials.hold} position-y={-size * 1.2} scale={size * 5} />
        </group>
      ))}
      {RUBBLE.map(({ x, z, size }) => (
        <mesh
          key={`${x}:${z}`}
          geometry={geometries.rubble}
          material={materials.rock}
          position={[x, size * 0.2, z]}
          rotation={[x * 3, z * 5, 0.4]}
          scale={[size * 1.3, size * 0.8, size]}
        />
      ))}
    </group>
  );
}

/** A floating island in small: a flat top torn from the floor, tapering to a jagged point below. Width 2. */
function slabGeometry(random: RandomSource) {
  const geometry = new CylinderGeometry(1, 0.12, 1.8, 6, 2);
  geometry.translate(0, -0.5, 0);
  return roughen(geometry, random, 0.5);
}

interface Crack {
  points: [number, number][];
  width: number;
}

/** Rifts running out from under his feet and branching on the way, in canvas units (0 to 1). */
function crackPaths(): { rifts: Crack[]; branches: Crack[] } {
  const random = seededRandom(47);
  const rifts: Crack[] = [];
  const branches: Crack[] = [];
  const walk = (x: number, y: number, angle: number, width: number, steps: number, depth: number) => {
    const points: [number, number][] = [[x, y]];
    for (let step = 0; step < steps; step++) {
      angle += (random() - 0.5) * 0.7;
      x += Math.cos(angle) * 0.022;
      y += Math.sin(angle) * 0.022;
      points.push([x, y]);
      if (Math.hypot(x - 0.5, y - 0.5) > 0.47) break;
      if (depth < 2 && random() < 0.11)
        walk(
          x,
          y,
          angle + (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.5),
          width * 0.55,
          6 + random() * 10,
          depth + 1,
        );
    }
    (depth === 0 ? rifts : branches).push({ points, width });
  };
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + random() * 0.5;
    const start = 0.04 + random() * 0.06;
    walk(0.5 + Math.cos(angle) * start, 0.5 + Math.sin(angle) * start, angle, 5 + random() * 3, 40, 0);
  }
  return { rifts, branches };
}

const CRACKS = crackPaths();

function strokeCracks(context: CanvasRenderingContext2D, size: number, cracks: Crack[], widen: number) {
  context.lineCap = context.lineJoin = "round";
  cracks.forEach(({ points, width }) => {
    // Each crack thins as it runs out, drawn a segment at a time.
    for (let index = 1; index < points.length; index++) {
      context.lineWidth = Math.max(0.6, width * (1 - (index / points.length) * 0.75)) * widen;
      context.beginPath();
      context.moveTo(points[index - 1][0] * size, points[index - 1][1] * size);
      context.lineTo(points[index][0] * size, points[index][1] * size);
      context.stroke();
    }
  });
}

/** Black glassy stone in broad facets, the rifts cut into it as dark grooves. */
function paintObsidian(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(43);
  context.fillStyle = "#07060b";
  context.fillRect(0, 0, size, size);
  for (let facet = 0; facet < 160; facet++) {
    const [x, y] = [random() * size, random() * size];
    const reach = 30 + random() * 70;
    context.fillStyle = `rgba(${130 + random() * 40},${110 + random() * 30},200,${0.02 + random() * 0.05})`;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * reach * 2, y + (random() - 0.5) * reach * 2);
    context.lineTo(x + (random() - 0.5) * reach * 2, y + (random() - 0.5) * reach * 2);
    context.fill();
  }
  for (let fleck = 0; fleck < 1800; fleck++) {
    context.fillStyle = random() < 0.6 ? "rgba(0,0,0,0.5)" : "rgba(150,130,200,0.12)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  context.strokeStyle = "#1a0d2e";
  strokeCracks(context, size, [...CRACKS.rifts, ...CRACKS.branches], 2.2);
}

/** The light inside the main rifts: a wide haze, then a bright core. White, tinted by the material. */
function paintFissures(context: CanvasRenderingContext2D, size: number) {
  context.strokeStyle = "rgba(255,255,255,0.12)";
  strokeCracks(context, size, CRACKS.rifts, 4);
  context.strokeStyle = "rgba(255,255,255,0.9)";
  strokeCracks(context, size, CRACKS.rifts, 0.9);
}

function paintVeins(context: CanvasRenderingContext2D, size: number) {
  context.strokeStyle = "rgba(255,255,255,0.12)";
  strokeCracks(context, size, CRACKS.branches, 4);
  context.strokeStyle = "rgba(255,255,255,0.8)";
  strokeCracks(context, size, CRACKS.branches, 0.9);
}

/** Three arms of soft smoke curling into the centre, white on transparent. */
function paintVortex(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(53);
  const centre = size / 2;
  const puffs = 240;
  for (let arm = 0; arm < 3; arm++) {
    for (let index = 0; index < puffs; index++) {
      const along = index / puffs;
      const angle = (arm / 3) * Math.PI * 2 + along * 5.5 + (random() - 0.5) * 0.3;
      const radius = (0.06 + along * 0.4) * size;
      const x = centre + Math.cos(angle) * radius;
      const y = centre + Math.sin(angle) * radius;
      const puff = (2 + along * 14) * (0.6 + random() * 0.8);
      const gradient = context.createRadialGradient(x, y, 0, x, y, puff);
      // Thickest mid-way out, thinning to nothing at both ends of the arm.
      const alpha = 0.16 * Math.sin(along * Math.PI);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(x - puff, y - puff, puff * 2, puff * 2);
    }
  }
}

/** Obsidian slabs leading into the rift, glowing violet at the joints, shards of void glass. */
const RIFT_GROUND: GroundDressing = {
  wash: { colour: "#7c3aed", alpha: 0.35 },
  path: { kind: "slabs", colour: "#2a1f3d", edge: "#8b5cf6", width: [0.15, 0.25] },
  litter: [{ shape: "shard", colours: ["rgba(190,140,255,0.85)", "rgba(40,20,70,0.9)"], count: 80, size: 5 }],
  glow: { colour: "#b06cff", count: 12 },
};
const paintRiftFloor = withDressing(paintObsidian, RIFT_GROUND);
