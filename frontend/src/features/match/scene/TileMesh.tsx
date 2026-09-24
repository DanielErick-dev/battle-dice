"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import type { Tile } from "@/game/domain/types";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "./boardLayout";
import { themeFor } from "./tileTheme";
import { useTileFaceTexture } from "./useTileFaceTexture";

const HIGHLIGHT_FALLBACK = "#f97316";

interface TileMeshProps {
  tile: Tile;
  position: Vec3;
  /** Path colour at this tile (see pathColor). */
  accent: string;
  /** Direction to the next tile on the face texture, or null on the last tile. */
  arrowAngle: number | null;
  /** Portal/trap in action: flashes the tile. */
  highlighted: boolean;
  /** Within reach of the active player's next roll: breathes softly. */
  reachable: boolean;
}

const UNDERGLOW_SIZE = TILE_SIZE + 0.28;

export function TileMesh({ tile, position, accent, arrowAngle, highlighted, reachable }: TileMeshProps) {
  const theme = useMemo(() => themeFor(tile), [tile]);
  const emissive = theme.glowIntensity > 0 ? theme.glow : HIGHLIGHT_FALLBACK;
  const glowColor = theme.kind === "regular" ? accent : theme.glow;
  const faceTexture = useTileFaceTexture({
    tileId: tile.id,
    theme,
    accent,
    arrowAngle,
  });
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const underglow = useRef<MeshBasicMaterial>(null);
  const lift = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (bodyMaterial.current) {
      const pulse = highlighted ? 1.2 + Math.sin(time * 10) * 0.6 : 0;
      bodyMaterial.current.emissiveIntensity = theme.glowIntensity * 0.35 + pulse;
    }
    if (underglow.current) {
      const breathe = reachable ? 0.75 + Math.sin(time * 4 - tile.id * 0.6) * 0.2 : 0.38;
      underglow.current.opacity += (breathe - underglow.current.opacity) * Math.min(1, delta * 8);
    }
    if (lift.current) {
      const target = reachable ? 0.06 : 0;
      lift.current.position.y += (target - lift.current.position.y) * Math.min(1, delta * 8);
    }
  });

  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position-y={-TILE_HEIGHT / 2 + 0.01}>
        <planeGeometry args={[UNDERGLOW_SIZE, UNDERGLOW_SIZE]} />
        <meshBasicMaterial
          ref={underglow}
          color={glowColor}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={lift}>
        <RoundedBox args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} radius={0.1} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial
            ref={bodyMaterial}
            color={theme.base}
            emissive={emissive}
            roughness={0.5}
            metalness={0.25}
          />
        </RoundedBox>

        <mesh rotation-x={-Math.PI / 2} position-y={TILE_HEIGHT / 2 + 0.003} receiveShadow>
          <planeGeometry args={[TILE_SIZE * 0.95, TILE_SIZE * 0.95]} />
          <meshStandardMaterial map={faceTexture} roughness={0.85} />
        </mesh>
      </group>

      {tile.effect.kind === "portal" && <PortalVortex color={theme.glow} />}
      {tile.effect.kind === "trap" && <TrapSpikes color={theme.glow} />}
      {tile.role === "finish" && <FinishBeacon color={theme.glow} />}
    </group>
  );
}

function PortalVortex({ color }: { color: string }) {
  const ring = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 1.6;
  });

  return (
    <group position={[0.1, TILE_HEIGHT / 2 + 0.05, -0.08]}>
      <group ref={ring} rotation-x={-Math.PI / 2}>
        <mesh>
          <torusGeometry args={[TILE_SIZE * 0.22, 0.045, 12, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
        <mesh scale={0.62}>
          <torusGeometry args={[TILE_SIZE * 0.22, 0.03, 12, 48, Math.PI * 1.4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
      <pointLight color={color} intensity={4} distance={3.5} position-y={0.5} />
      <Sparkles count={18} scale={[1.2, 1.4, 1.2]} position-y={0.6} size={3} speed={0.6} color={color} />
    </group>
  );
}

const SPIKE_SPOTS: readonly [number, number][] = [
  [-0.35, 0.05],
  [0, -0.1],
  [0.35, 0.05],
  [0.2, -0.45],
  [0.5, -0.4],
];

function TrapSpikes({ color }: { color: string }) {
  return (
    <group position-y={TILE_HEIGHT / 2}>
      {SPIKE_SPOTS.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, 0.16, z]} castShadow>
          <coneGeometry args={[0.1, 0.32, 6]} />
          <meshStandardMaterial
            color="#3a0a0f"
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      ))}
      <pointLight color={color} intensity={1.5} distance={2.5} position-y={0.4} />
    </group>
  );
}

function FinishBeacon({ color }: { color: string }) {
  const trophy = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!trophy.current) return;
    trophy.current.rotation.y = clock.elapsedTime * 0.8;
    trophy.current.position.y = 1.9 + Math.sin(clock.elapsedTime * 2) * 0.12;
  });

  return (
    <group>
      <mesh position-y={1.6}>
        <cylinderGeometry args={[0.55, 0.75, 3, 24, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <group ref={trophy}>
        <mesh castShadow>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>
      <pointLight color={color} intensity={3} distance={4} position-y={1.2} />
    </group>
  );
}
