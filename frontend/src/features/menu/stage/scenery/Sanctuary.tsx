"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  Color,
  DodecahedronGeometry,
  MeshStandardMaterial,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { useFeatherTexture } from "@/features/match/scene/character/HeavenDescent";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { useRuneTexture } from "@/features/match/scene/character/runeCircle";
import { seededRandom } from "@/game/domain/random";
import { useNoiseTexture, type NoiseLook } from "./kit/textures";
import type { GroundDressing } from "./kit/groundDressing";

const DAIS_RADIUS = 0.6;
const DAIS_STEP = 0.06;
const GOLD = "#e8b84a";
const COLUMNS = [
  { x: -0.66, z: -0.58, height: 1.35, broken: false, lean: 0 },
  { x: -0.32, z: -0.9, height: 0.85, broken: true, lean: 0.04 },
  { x: 0.36, z: -0.88, height: 1.15, broken: false, lean: -0.02 },
  { x: 0.66, z: -0.52, height: 0.55, broken: true, lean: -0.06 },
];
/** Side limit for everything here: the canvas bleeds past the stage's box (CANVAS_BLEED) and would spill over the page. */
const HALF_WIDTH = 0.8;
const COLUMN_RADIUS = 0.07;
const FEATHERS = 14;
const FEATHER_HEIGHT = 2.2;
const CLOUDS = 26;
const CLOUD_SPREAD = 0.95;
const RAYS = 5;

/**
 * Seraphiel's stage instead of the rune pedestal: a marble dais over clouds, columns, feathers, rays of light.
 * Shakes in the wind of his wingbeats (`gust`, 0 to 1). Origin on the floor.
 */
export function Sanctuary({ gust: wind }: { gust: RefObject<number> }) {
  const marble = useNoiseTexture(MARBLE);
  const top = useNoiseTexture(DAIS_TOP);
  const runes = useRuneTexture();
  const ring = useRef<Mesh>(null);
  const materials = useMemo(
    () => ({
      marble: new MeshStandardMaterial({
        map: marble,
        roughness: 0.35,
        metalness: 0.05,
      }),
      top: new MeshStandardMaterial({ map: top, roughness: 0.35, metalness: 0.05 }),
      gold: new MeshStandardMaterial({
        color: GOLD,
        metalness: 0.9,
        roughness: 0.25,
        emissive: "#7a5410",
        emissiveIntensity: 0.4,
      }),
    }),
    [marble, top],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const rubble = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useEffect(() => () => rubble.dispose(), [rubble]);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.12;
  });

  return (
    <group>
      {/* Drawn first without depth, so a foot dipping below the top still shows. */}
      <mesh material={materials.marble} position-y={-DAIS_STEP / 2} renderOrder={-1}>
        <cylinderGeometry args={[DAIS_RADIUS, DAIS_RADIUS, DAIS_STEP, 48]} />
      </mesh>
      <mesh material={materials.marble} position-y={-DAIS_STEP * 1.5}>
        <cylinderGeometry args={[DAIS_RADIUS * 1.22, DAIS_RADIUS * 1.26, DAIS_STEP, 48]} />
      </mesh>
      <mesh material={materials.gold} position-y={-0.004} rotation-x={Math.PI / 2}>
        <torusGeometry args={[DAIS_RADIUS, 0.012, 8, 64]} />
      </mesh>
      <mesh material={materials.gold} position-y={-DAIS_STEP - 0.004} rotation-x={Math.PI / 2}>
        <torusGeometry args={[DAIS_RADIUS * 1.22, 0.01, 8, 64]} />
      </mesh>
      {/* Its top: the dressed marble, so the gold way and the feathers stay off the sides. */}
      <mesh material={materials.top} position-y={0.001} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[DAIS_RADIUS, 64]} />
      </mesh>
      <mesh ref={ring} position-y={0.002} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[DAIS_RADIUS * 0.94, 64]} />
        <meshBasicMaterial
          map={runes}
          color={new Color(GOLD).multiplyScalar(1.4)}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {COLUMNS.map((column) => (
        <Column key={`${column.x}:${column.z}`} {...column} materials={materials} rubble={rubble} wind={wind} />
      ))}
      <DriftingFeathers wind={wind} />
      <CloudSea wind={wind} />
      <LightRays wind={wind} />
    </group>
  );
}

/** A marble column capped in gold, or broken off with its drum fallen beside it. */
function Column({
  x,
  z,
  height,
  broken,
  lean,
  materials,
  rubble,
  wind,
}: (typeof COLUMNS)[number] & {
  materials: { marble: MeshStandardMaterial; gold: MeshStandardMaterial };
  rubble: DodecahedronGeometry;
  wind: RefObject<number>;
}) {
  const r = COLUMN_RADIUS;
  const column = useRef<Group>(null);
  // Trembles in the gust, rocked away from the dais.
  useFrame(({ clock }) => {
    if (!column.current) return;
    const t = clock.elapsedTime;
    const strength = wind.current;
    column.current.rotation.z = lean + Math.sin(t * 31 + x * 9) * strength * 0.035 - Math.sign(x) * strength * 0.03;
    column.current.rotation.x = Math.sin(t * 27 + z * 7) * strength * 0.025 - strength * 0.02;
  });
  return (
    <group ref={column} position={[x, -DAIS_STEP * 2, z]} rotation-z={lean}>
      <mesh material={materials.marble} position-y={0.04}>
        <boxGeometry args={[r * 3, 0.08, r * 3]} />
      </mesh>
      <mesh material={materials.gold} position-y={0.09}>
        <cylinderGeometry args={[r * 1.25, r * 1.3, 0.025, 20]} />
      </mesh>
      {/* Faceted for the flutes. */}
      <mesh material={materials.marble} position-y={0.1 + height / 2}>
        <cylinderGeometry args={[r * 0.92, r, height, 14]} />
      </mesh>
      {broken ? (
        <>
          <mesh geometry={rubble} material={materials.marble} position-y={0.1 + height} scale={[r, r * 0.6, r]} />
          {/* The fallen drum, toward the dais. */}
          <mesh
            material={materials.marble}
            position={[-Math.sign(x) * r * 2.6, r, r * 1.5]}
            rotation={[0.3, 0.6, Math.PI / 2]}
          >
            <cylinderGeometry args={[r * 0.92, r * 0.92, r * 3, 14]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={materials.gold} position-y={0.1 + height + 0.015}>
            <cylinderGeometry args={[r * 1.35, r * 0.95, 0.03, 20]} />
          </mesh>
          <mesh material={materials.marble} position-y={0.1 + height + 0.06}>
            <boxGeometry args={[r * 3, 0.06, r * 3]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function DriftingFeathers({ wind }: { wind: RefObject<number> }) {
  const texture = useFeatherTexture();
  const pieces = useRef<(Mesh | null)[]>([]);
  const feathers = useMemo(() => {
    const random = seededRandom(31);
    return Array.from({ length: FEATHERS }, () => ({
      // Round the back and sides, clear of the figure's face.
      x: (random() < 0.5 ? -1 : 1) * (0.3 + random() * (HALF_WIDTH - 0.42)),
      z: -0.9 + random() * 1.1,
      height: random() * FEATHER_HEIGHT,
      speed: 0.06 + random() * 0.06,
      phase: random() * Math.PI * 2,
      size: 0.8 + random() * 0.5,
      /** How far a gust has blown it off its path; eases back as the wind drops. */
      blown: 0,
    }));
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const strength = wind.current;
    feathers.forEach((feather, index) => {
      const piece = pieces.current[index];
      if (!piece) return;
      feather.height -= feather.speed * delta * (1 - strength * 1.5);
      if (feather.height < 0) feather.height += FEATHER_HEIGHT;
      if (feather.height > FEATHER_HEIGHT) feather.height -= FEATHER_HEIGHT;
      feather.blown += (strength * 0.35 - feather.blown) * Math.min(1, delta * 4);
      const sway = Math.sin(t * 0.9 + feather.phase);
      piece.position.set(
        feather.x + sway * 0.07 + Math.sign(feather.x) * feather.blown,
        feather.height,
        feather.z + Math.cos(t * 0.7 + feather.phase) * 0.04 - feather.blown * 0.5,
      );
      // Rocks like a falling leaf; tumbles in the wind.
      piece.rotation.set(
        0.4 + sway * 0.25 + feather.blown * 8,
        t * 0.5 + feather.phase,
        sway * 0.6 + feather.blown * 5,
      );
      // Faded in at the top and out on the ground.
      const material = piece.material as MeshBasicMaterial;
      material.opacity = 0.9 * Math.min(1, (FEATHER_HEIGHT - feather.height) * 3, feather.height * 4);
    });
  });

  return (
    <>
      {feathers.map(({ size }, index) => (
        <mesh key={index} ref={(mesh) => void (pieces.current[index] = mesh)} scale={size}>
          <planeGeometry args={[0.05, 0.13]} />
          <meshBasicMaterial map={texture} color="#fffaf0" transparent side={DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function CloudSea({ wind }: { wind: RefObject<number> }) {
  const disc = useSoftDisc();
  const puffs = useRef<(Mesh | null)[]>([]);
  const clouds = useMemo(() => {
    const random = seededRandom(17);
    return Array.from({ length: CLOUDS }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.55 + random() * (CLOUD_SPREAD - 0.55),
      height: -0.16 + random() * 0.1,
      size: 0.35 + random() * 0.35,
      speed: (0.02 + random() * 0.03) * (random() < 0.5 ? 1 : -1),
      tint: random(),
    }));
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    // Pushed back from the dais by the wind.
    const push = 1 + wind.current * 0.3;
    clouds.forEach(({ angle, radius, height, size, speed }, index) => {
      const puff = puffs.current[index];
      if (!puff) return;
      const at = angle + t * speed;
      const x = Math.max(-HALF_WIDTH + 0.12, Math.min(HALF_WIDTH - 0.12, Math.cos(at) * radius * push));
      puff.position.set(x, height + wind.current * 0.04 * Math.sin(t * 20 + index), Math.sin(at) * radius * push);
      // Narrowed at the sides so no puff spills past the stage.
      const width = Math.min(size * (1 + 0.06 * Math.sin(t * 0.4 + index)), 2 * (HALF_WIDTH - Math.abs(x)));
      puff.scale.setScalar(Math.max(0.15, width));
      puff.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <>
      {clouds.map(({ tint }, index) => (
        <mesh key={index} ref={(mesh) => void (puffs.current[index] = mesh)} renderOrder={2}>
          <planeGeometry args={[1, 0.55]} />
          <meshBasicMaterial
            map={disc}
            color={tint < 0.3 ? "#fde9b8" : "#f4f1ff"}
            opacity={0.5}
            transparent
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

function LightRays({ wind }: { wind: RefObject<number> }) {
  const disc = useSoftDisc();
  const rays = useRef<(Mesh | null)[]>([]);
  const beams = useMemo(
    () =>
      Array.from({ length: RAYS }, (_, index) => ({
        x: -0.55 + (index / (RAYS - 1)) * 1.1,
        z: -0.6 - (index % 2) * 0.25,
        tilt: -0.25 + (index / (RAYS - 1)) * 0.5,
        width: 0.12 + (index % 3) * 0.06,
        phase: index * 1.7,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    beams.forEach(({ phase }, index) => {
      const ray = rays.current[index];
      const flicker = wind.current * 0.12 * Math.sin(t * 47 + phase * 5);
      if (ray) (ray.material as MeshBasicMaterial).opacity = 0.1 + 0.07 * Math.sin(t * 0.6 + phase) + flicker;
    });
  });

  return (
    <>
      {beams.map(({ x, z, tilt, width }, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (rays.current[index] = mesh)}
          position={[x, 0.95, z]}
          rotation-z={tilt}
          scale={[width, 2.1, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#fff1c4"
            transparent
            opacity={0.12}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

const MARBLE: NoiseLook = {
  base: [236, 232, 224],
  dark: [200, 192, 182],
  light: [252, 250, 246],
  fadeOut: false,
};
/** A way of gold-veined slabs across the dais, feathers fallen from his wings, a warm glow. */
const HEAVEN_GROUND: GroundDressing = {
  wash: { colour: "#fbbf24", alpha: 0.2 },
  path: { kind: "slabs", colour: "#e8d9a8", edge: "#c9a227", width: [0.18, 0.28], wind: 0 },
  litter: [{ shape: "leaf", colours: ["rgba(255,255,255,0.95)", "rgba(255,244,214,0.9)"], count: 50, size: 6 }],
};
const DAIS_TOP: NoiseLook = { ...MARBLE, dress: HEAVEN_GROUND };
