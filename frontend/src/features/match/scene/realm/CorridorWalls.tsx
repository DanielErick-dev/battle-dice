"use client";

import { useMemo } from "react";
import { Color, DoubleSide } from "three";
import type { RealmKind } from "@/game/domain/types";
import { CORRIDOR_HALF_WIDTH, TILE_HEIGHT, TILE_PITCH, TILE_SIZE, type Vec3 } from "../boardLayout";

/** How tall the walls stand over the tiles, and how thick they are. */
const WALL_HEIGHT = 2.6;
const WALL_THICKNESS = 0.35;
/** How far the floor reaches past the first and last tiles. */
const END_MARGIN = TILE_PITCH * 0.7;
/** A pillar stands against each wall every this many tiles. */
const PILLAR_EVERY = 3;

/** Stone, trim and glow of each realm's corridor. */
const LOOK = {
  celestial: { stone: "#eef0f6", floor: "#dfe3ee", roughness: 0.35, trim: "#f5d77a" },
  infernal: { stone: "#1c0f0c", floor: "#120806", roughness: 0.95, trim: "#ff5a14" },
} as const;

interface CorridorWallsProps {
  realm: RealmKind;
  /** The track's tiles, far to near, all on one line (see corridorPositions). */
  positions: readonly Vec3[];
}

/**
 * What closes a realm track into a corridor, laid out in world space on the tiles' level; the near
 * end, towards the camera, stays open. Hell is a tight passage of dark basalt walls with pillars and
 * glowing seams of lava, shut at the far end; heaven an open cloister of white marble (see
 * CelestialCloister).
 */
export function CorridorWalls({ realm, positions }: CorridorWallsProps) {
  return realm === "celestial" ? (
    <CelestialCloister positions={positions} />
  ) : (
    <InfernalPassage positions={positions} />
  );
}

/** Hell's corridor: a tight passage of dark basalt walls split by seams of lava. */
function InfernalPassage({ positions }: { positions: readonly Vec3[] }) {
  const look = LOOK.infernal;
  const halfWidth = CORRIDOR_HALF_WIDTH.infernal;
  const glow = useMemo(() => new Color(look.trim).multiplyScalar(2.4), [look]);
  const [x, level] = positions[0];
  const startZ = positions[0][2];
  const endZ = positions.at(-1)![2];
  const near = Math.max(startZ, endZ) + END_MARGIN;
  const far = Math.min(startZ, endZ) - END_MARGIN;
  const length = near - far;
  const centreZ = (near + far) / 2;
  const floorY = level - TILE_HEIGHT / 2 - 0.08;
  const wallY = floorY + WALL_HEIGHT / 2;
  const wallX = halfWidth + WALL_THICKNESS / 2;
  const pillars = positions.filter((_, index) => index % PILLAR_EVERY === 1).map(([, , z]) => z);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, floorY - 0.1, centreZ]} receiveShadow>
        <boxGeometry args={[halfWidth * 2 + WALL_THICKNESS * 2, 0.2, length]} />
        <meshStandardMaterial color={look.floor} roughness={look.roughness} metalness={0.15} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * wallX, wallY, centreZ]} castShadow receiveShadow>
            <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, length]} />
            <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} />
          </mesh>
          {/* A seam of lava along the middle. */}
          <mesh position={[side * (wallX - WALL_THICKNESS / 2 - 0.01), floorY + WALL_HEIGHT * 0.45, centreZ]}>
            <boxGeometry args={[0.04, 0.06, length]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
          {pillars.map((z) => (
            <Pillar key={z} realm="infernal" glow={glow} position={[side * (halfWidth - 0.05), floorY, z]} />
          ))}
          {pillars.map((z, index) => (
            <LavaCrack
              key={z}
              glow={glow}
              side={side}
              position={[side * (wallX - WALL_THICKNESS / 2 - 0.02), floorY, z + TILE_PITCH * 1.5]}
              seed={index + side}
            />
          ))}
        </group>
      ))}

      <mesh position={[0, wallY, far - WALL_THICKNESS / 2]} castShadow>
        <boxGeometry args={[halfWidth * 2 + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} />
      </mesh>
    </group>
  );
}

/** A pillar against the wall: fluted marble crowned with gold, or a rough column of basalt. */
function Pillar({ realm, glow, position }: { realm: RealmKind; glow: Color; position: Vec3 }) {
  const height = WALL_HEIGHT + 0.25;
  const celestial = realm === "celestial";
  return (
    <group position={position}>
      <mesh position-y={height / 2} castShadow>
        <cylinderGeometry args={[0.2, 0.24, height, celestial ? 16 : 6]} />
        <meshStandardMaterial color={celestial ? "#f7f8fc" : "#2a1510"} roughness={celestial ? 0.3 : 0.9} />
      </mesh>
      <mesh position-y={height}>
        <boxGeometry args={[0.55, 0.14, 0.55]} />
        {celestial ? (
          <meshStandardMaterial
            color="#e8c766"
            metalness={0.8}
            roughness={0.3}
            emissive="#a07a20"
            emissiveIntensity={0.4}
          />
        ) : (
          <meshBasicMaterial color={glow} toneMapped={false} />
        )}
      </mesh>
    </group>
  );
}

/** A jagged crack of lava running down the inner face of an infernal wall. */
function LavaCrack({ glow, side, position, seed }: { glow: Color; side: number; position: Vec3; seed: number }) {
  const segments = useMemo(() => crackSegments(seed), [seed]);
  return (
    <group position={position}>
      {segments.map(({ y, z, length, tilt }, index) => (
        <mesh key={index} position={[0, y, z]} rotation-x={side * tilt}>
          <boxGeometry args={[0.03, length, 0.05]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The straight runs of a crack zigzagging down from near the wall's top, fixed by `seed`. */
function crackSegments(seed: number) {
  const segments = [];
  let y = WALL_HEIGHT * 0.9;
  let z = 0;
  for (let index = 0; index < 5; index++) {
    const length = 0.35 + ((seed * 7 + index * 3) % 5) * 0.06;
    const tilt = ((seed + index) % 2 === 0 ? 1 : -1) * (0.35 + ((index * 5 + seed) % 3) * 0.15);
    segments.push({ y: y - (length / 2) * Math.cos(tilt), z: z + (length / 2) * Math.sin(tilt), length, tilt });
    y -= length * Math.cos(tilt);
    z += length * Math.sin(tilt);
  }
  return segments;
}

/** Heaven's columns stand every this many tiles, an arch of gold across the cloister on each pair. */
const COLONNADE_EVERY = 2;

/**
 * Heaven's corridor: wide and open, nothing square about it. A long rounded floor of white marble
 * with a gold path inlaid under the tiles, a low rounded balustrade along each side, fluted columns
 * joined across by gold arches, and a curved apse of marble closing the far end.
 */
function CelestialCloister({ positions }: { positions: readonly Vec3[] }) {
  const look = LOOK.celestial;
  const halfWidth = CORRIDOR_HALF_WIDTH.celestial;
  const glow = useMemo(() => new Color(look.trim).multiplyScalar(1.6), [look]);
  const [x, level] = positions[0];
  const startZ = positions[0][2];
  const endZ = positions.at(-1)![2];
  const near = Math.max(startZ, endZ) + END_MARGIN;
  const far = Math.min(startZ, endZ) - END_MARGIN;
  const length = near - far;
  const centreZ = (near + far) / 2;
  const floorY = level - TILE_HEIGHT / 2 - 0.08;
  const columnHeight = WALL_HEIGHT + 0.25;
  const columns = positions.filter((_, index) => index % COLONNADE_EVERY === 1).map(([, , z]) => z);
  const railY = floorY + 0.55;

  return (
    <group position={[x, 0, 0]}>
      {/* The floor, rounded off at the far end where the apse stands. */}
      <mesh position={[0, floorY - 0.1, centreZ]} receiveShadow>
        <boxGeometry args={[halfWidth * 2 + 0.4, 0.2, length]} />
        <meshStandardMaterial color={look.floor} roughness={look.roughness} metalness={0.15} />
      </mesh>
      <mesh position={[0, floorY - 0.1, far]} receiveShadow>
        <cylinderGeometry args={[halfWidth + 0.2, halfWidth + 0.2, 0.2, 48, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={look.floor} roughness={look.roughness} metalness={0.15} />
      </mesh>
      <mesh position={[0, floorY + 0.005, centreZ]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[TILE_SIZE + 0.5, length]} />
        <meshStandardMaterial
          color="#f8e7a8"
          emissive={glow}
          emissiveIntensity={0.25}
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          {/* A low rounded rail on short posts, open to the sky above it. */}
          <mesh position={[side * halfWidth, railY, centreZ]} rotation-x={Math.PI / 2}>
            <capsuleGeometry args={[0.1, length - 0.2, 4, 12]} />
            <meshStandardMaterial color={look.stone} roughness={look.roughness} />
          </mesh>
          {positions.map(([, , z]) => (
            <mesh key={z} position={[side * halfWidth, floorY + 0.27, z]}>
              <cylinderGeometry args={[0.07, 0.1, 0.54, 10]} />
              <meshStandardMaterial color={look.stone} roughness={look.roughness} />
            </mesh>
          ))}
          {columns.map((z) => (
            <Pillar key={z} realm="celestial" glow={glow} position={[side * halfWidth, floorY, z]} />
          ))}
        </group>
      ))}

      {/* A gold arch over the cloister on each pair of columns. */}
      {columns.map((z) => (
        <mesh key={z} position={[0, floorY + columnHeight + 0.05, z]}>
          <torusGeometry args={[halfWidth, 0.09, 10, 48, Math.PI]} />
          <meshStandardMaterial
            color="#e8c766"
            metalness={0.8}
            roughness={0.3}
            emissive={glow}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}

      {/* The apse: a curved marble wall closing the far end, with a band of light along its top. */}
      <mesh position={[0, floorY + WALL_HEIGHT / 2, far]}>
        <cylinderGeometry args={[halfWidth + 0.2, halfWidth + 0.2, WALL_HEIGHT, 48, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} side={DoubleSide} />
      </mesh>
      <mesh position={[0, floorY + WALL_HEIGHT - 0.12, far]}>
        <cylinderGeometry args={[halfWidth + 0.14, halfWidth + 0.14, 0.12, 48, 1, true, Math.PI / 2, Math.PI]} />
        <meshBasicMaterial color={glow} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
