"use client";

import { useMemo } from "react";
import { Color } from "three";
import type { RealmKind } from "@/game/domain/types";
import { CORRIDOR_HALF_WIDTH, TILE_HEIGHT, TILE_PITCH, type Vec3 } from "../boardLayout";

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
 * The walls closing a realm track into a corridor: a floor under the tiles, a wall either side
 * with pillars along it and a wall shutting the far end; the near end, towards the camera, stays
 * open. Heaven is white marble trimmed with gold and lit by strips of light; hell is dark basalt
 * split by glowing seams of lava. Laid out in world space, standing on the tiles' level.
 */
export function CorridorWalls({ realm, positions }: CorridorWallsProps) {
  const look = LOOK[realm];
  const glow = useMemo(() => new Color(look.trim).multiplyScalar(realm === "infernal" ? 2.4 : 1.6), [look, realm]);
  const [x, level] = positions[0];
  const startZ = positions[0][2];
  const endZ = positions.at(-1)![2];
  const near = Math.max(startZ, endZ) + END_MARGIN;
  const far = Math.min(startZ, endZ) - END_MARGIN;
  const length = near - far;
  const centreZ = (near + far) / 2;
  const floorY = level - TILE_HEIGHT / 2 - 0.08;
  const wallY = floorY + WALL_HEIGHT / 2;
  const wallX = CORRIDOR_HALF_WIDTH + WALL_THICKNESS / 2;
  const pillars = positions.filter((_, index) => index % PILLAR_EVERY === 1).map(([, , z]) => z);

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, floorY - 0.1, centreZ]} receiveShadow>
        <boxGeometry args={[CORRIDOR_HALF_WIDTH * 2 + WALL_THICKNESS * 2, 0.2, length]} />
        <meshStandardMaterial color={look.floor} roughness={look.roughness} metalness={0.15} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * wallX, wallY, centreZ]} castShadow receiveShadow>
            <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, length]} />
            <meshStandardMaterial color={look.stone} roughness={look.roughness} metalness={0.1} />
          </mesh>
          {/* Gold trim along the top in heaven; a seam of lava along the middle in hell. */}
          <mesh
            position={[
              side * (wallX - WALL_THICKNESS / 2 - 0.01),
              realm === "celestial" ? floorY + WALL_HEIGHT - 0.12 : floorY + WALL_HEIGHT * 0.45,
              centreZ,
            ]}
          >
            <boxGeometry args={[0.04, realm === "celestial" ? 0.12 : 0.06, length]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
          {pillars.map((z) => (
            <Pillar key={z} realm={realm} glow={glow} position={[side * (CORRIDOR_HALF_WIDTH - 0.05), floorY, z]} />
          ))}
          {realm === "infernal" &&
            pillars.map((z, index) => (
              <LavaCrack
                key={z}
                glow={glow}
                side={side}
                position={[side * (wallX - WALL_THICKNESS / 2 - 0.02), floorY, z + TILE_PITCH * 1.5]}
                seed={index + side}
              />
            ))}
          {realm === "celestial" &&
            pillars.map((z) => (
              <mesh key={z} position={[side * (wallX - WALL_THICKNESS / 2 - 0.01), wallY, z + TILE_PITCH * 1.5]}>
                <boxGeometry args={[0.03, WALL_HEIGHT * 0.7, 0.1]} />
                <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.8} />
              </mesh>
            ))}
        </group>
      ))}

      <mesh position={[0, wallY, far - WALL_THICKNESS / 2]} castShadow>
        <boxGeometry args={[CORRIDOR_HALF_WIDTH * 2 + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]} />
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
