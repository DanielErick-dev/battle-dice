"use client";

import { RoundedBox, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import type { Tile } from "@/game/domain/types";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "./boardLayout";
import { PortalVortex } from "./PortalVortex";
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
  /** Face texture size in pixels. */
  textureSize: number;
}

const UNDERGLOW_SIZE = TILE_SIZE + 0.28;

export function TileMesh({ tile, position, accent, arrowAngle, highlighted, reachable, textureSize }: TileMeshProps) {
  const theme = useMemo(() => themeFor(tile), [tile]);
  const emissive = theme.glowIntensity > 0 ? theme.glow : HIGHLIGHT_FALLBACK;
  const glowColor = theme.kind === "regular" ? accent : theme.glow;
  const faceTexture = useTileFaceTexture({
    tileId: tile.id,
    theme,
    accent,
    arrowAngle,
    resolution: textureSize,
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

        {tile.effect.kind === "portal" && <PortalVortex color={theme.glow} active={highlighted} phase={tile.id * 1.7} />}
        {tile.effect.kind === "trap" && <TrapSpikes color={theme.glow} />}
        {tile.effect.kind === "advance" && <AdvanceChevrons color={theme.glow} angle={arrowAngle ?? 0} />}
        {tile.effect.kind === "extraTurn" && <FloatingDie color={theme.glow} />}
        {tile.effect.kind === "skipTurn" && <Hourglass color={theme.glow} />}
        {tile.role === "finish" && <FinishBeacon color={theme.glow} />}
      </group>
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
    </group>
  );
}

/** Three chevrons that light up in sequence along the direction of travel. */
function AdvanceChevrons({ color, angle }: { color: string; angle: number }) {
  const chevrons = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    chevrons.current.forEach((material, i) => {
      if (!material) return;
      const wave = (Math.sin(clock.elapsedTime * 6 - i * 1.2) + 1) / 2;
      material.emissiveIntensity = 0.6 + wave * 2.4;
    });
  });

  return (
    <group position-y={TILE_HEIGHT / 2 + 0.12} rotation-y={-angle}>
      {[-0.35, 0, 0.35].map((x, i) => (
        <mesh key={x} position-x={x} rotation-z={-Math.PI / 2} scale={[1, 1, 0.35]}>
          <coneGeometry args={[0.2, 0.26, 3]} />
          <meshStandardMaterial
            ref={(material) => {
              chevrons.current[i] = material;
            }}
            color={color}
            emissive={color}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FloatingDie({ color }: { color: string }) {
  const die = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (!die.current) return;
    die.current.rotation.x += delta * 0.9;
    die.current.rotation.y += delta * 1.3;
    die.current.position.y = 0.85 + Math.sin(clock.elapsedTime * 2.2) * 0.1;
  });

  return (
    <group ref={die}>
      <RoundedBox args={[0.42, 0.42, 0.42]} radius={0.07} smoothness={3} castShadow>
        <meshStandardMaterial color="#f4f4f5" emissive={color} emissiveIntensity={0.35} roughness={0.3} />
      </RoundedBox>
      <Sparkles count={10} scale={[0.9, 0.9, 0.9]} size={2.5} speed={0.5} color={color} />
    </group>
  );
}

/** Slowly turning hourglass: two cones tip to tip between caps. */
function Hourglass({ color }: { color: string }) {
  const glass = useRef<Group>(null);

  useFrame((_, delta) => {
    if (glass.current) glass.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={glass} position-y={TILE_HEIGHT / 2 + 0.45} scale={0.85}>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position-y={side * 0.19} rotation-x={side > 0 ? Math.PI : 0}>
            <coneGeometry args={[0.2, 0.36, 16, 1, true]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.55}
              side={DoubleSide}
            />
          </mesh>
          <mesh position-y={side * 0.39} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.05, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
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
