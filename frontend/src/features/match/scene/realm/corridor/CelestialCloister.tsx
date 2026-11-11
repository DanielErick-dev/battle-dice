"use client";

import { DoubleSide } from "three";
import { useGlowColor } from "@/features/characters/shared/glowColor";
import { CORRIDOR_HALF_WIDTH, TILE_SIZE, type Vec3 } from "@/features/shared/board/boardLayout";
import { corridorSpan, everyNthDepth, LOOK, PILLAR_HEIGHT, WALL_HEIGHT } from "./layout";
import { Pillar } from "./Pillar";

/** Heaven's columns stand every this many tiles, an arch of gold across the cloister on each pair. */
const COLONNADE_EVERY = 2;

/**
 * Heaven's corridor: wide and open, nothing square about it. A long rounded floor of white marble
 * with a gold path inlaid under the tiles, a low rounded balustrade along each side, fluted columns
 * joined across by gold arches, and a curved apse of marble closing the far end.
 */
export function CelestialCloister({ positions }: { positions: readonly Vec3[] }) {
  const look = LOOK.celestial;
  const halfWidth = CORRIDOR_HALF_WIDTH.celestial;
  const glow = useGlowColor(look.trim, 1.6);
  const { x, far, length, centreZ, floorY } = corridorSpan(positions);
  const columns = everyNthDepth(positions, COLONNADE_EVERY);
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
        <mesh key={z} position={[0, floorY + PILLAR_HEIGHT + 0.05, z]}>
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
