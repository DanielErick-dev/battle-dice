"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, type Group, type Mesh, type MeshBasicMaterial, Vector3 } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { useAge } from "../useAge";
import { fadingMaterial, preloadProps, Prop, usePropMesh } from "./props";

const VOID_VIOLET = "#8b5cf6";
const VOID_GLOW = "#c4b5fd";
const VOID_DARK = "#07030f";

/** A rift's lip: a violet crack breathing round the tile, motes rising out of it. */
export function RiftMaw({ position }: { position: Vec3 }) {
  const rim = useRef<MeshBasicMaterial>(null);
  const top = position[1] + TILE_HEIGHT / 2 + 0.02;
  useFrame(({ clock }) => {
    if (rim.current) rim.current.opacity = 0.55 + Math.sin(clock.elapsedTime * 2.4 + position[0]) * 0.25;
  });
  return (
    <group position={[position[0], top, position[2]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[TILE_SIZE * 0.5, TILE_SIZE * 0.68, 48]} />
        <meshBasicMaterial
          ref={rim}
          color={VOID_VIOLET}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Sparkles
        count={14}
        scale={[TILE_SIZE, 1.4, TILE_SIZE]}
        position-y={0.6}
        size={3}
        speed={0.5}
        color={VOID_GLOW}
      />
    </group>
  );
}

/** Seconds the Void takes to come and work a rift open (the playback's voidRiftMs, roughly). */
const SURGE_SECONDS = 1.8;

/** The Void at work on a tile: a black maw opens, wreathed in violet, a column of void rising, then it closes. */
export function VoidSurge({ position, inward }: { position: Vec3; inward: boolean }) {
  const age = useAge();
  const maw = useRef<Group>(null);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const top = position[1] + TILE_HEIGHT / 2 + 0.03;
  useFrame(({ clock }, delta) => {
    const t = Math.min(1, age(clock.elapsedTime) / SURGE_SECONDS);
    // Opens fast, holds, closes.
    const open = t < 0.25 ? t / 0.25 : t > 0.8 ? (1 - t) / 0.2 : 1;
    if (maw.current) {
      maw.current.scale.setScalar(Math.max(0.001, open));
      maw.current.rotation.y += delta * (inward ? 2.5 : -2.5);
    }
    if (column.current) column.current.scale.set(open, 0.2 + open * 1.2, open);
    if (columnMaterial.current) columnMaterial.current.opacity = open * 0.45;
    if (glow.current) glow.current.opacity = open * 0.5;
  });
  return (
    <group position={[position[0], top, position[2]]}>
      <group ref={maw}>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[TILE_SIZE * 0.62, 40]} />
          <meshBasicMaterial color={VOID_DARK} transparent opacity={0.92} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
          <ringGeometry args={[TILE_SIZE * 0.58, TILE_SIZE * 0.78, 6, 1]} />
          <meshBasicMaterial color={VOID_VIOLET} transparent blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={column} position-y={1.1}>
        <cylinderGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.55, 2.2, 24, 1, true]} />
        <meshBasicMaterial
          ref={columnMaterial}
          color={VOID_VIOLET}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Sparkles
        count={40}
        scale={[TILE_SIZE * 1.4, 2.4, TILE_SIZE * 1.4]}
        position-y={1}
        size={5}
        speed={inward ? 1.6 : 0.8}
        color={VOID_GLOW}
      />
      {/* A glow on the ground instead of a light: adding lights recompiles every material and stalls the game. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <circleGeometry args={[TILE_SIZE * 1.6, 40]} />
        <meshBasicMaterial
          ref={glow}
          color={VOID_VIOLET}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Seconds a wander leg lasts, and of each cycle the Void shows for (it only now and then comes out). */
const WANDER_SECONDS = 6;
const CYCLE_SECONDS = 26;
const SHOWN_SECONDS = 11;
/** The wraith's height in world units (a figure stands about 1.9), and how high its tail drifts off the ground. */
const WRAITH_HEIGHT = 2.6;
const TAIL_CLEARANCE = 0.25;
/** How much of its texture's colour is kept. */
const WRAITH_SHADE = 0.18;

preloadProps(["voidWraith"]);

interface VoidWraithProps {
  /** Tiles it drifts between. */
  roam: readonly Vec3[];
  /** Zarek's latest call: a fresh id sends it rushing to `at` for as long as the rift takes. */
  call: { id: number; at: Vec3 } | null;
}

/**
 * The Void itself, a wraith of black smoke (PROPS.voidWraith) drifting low over the board: now and
 * then it comes out to roam, and whenever Zarek calls on it, it rushes to the tile and stays till
 * done. Not rigged: it bobs, leans into its drift and breathes in code.
 */
export function VoidWraith({ roam, call }: VoidWraithProps) {
  const { geometry, material } = usePropMesh("voidWraith");
  // Its texture reads grey under the moon: darkened to black smoke, with a faint violet glow from within.
  const shade = useMemo(() => {
    const black = fadingMaterial(material, WRAITH_SHADE);
    black.emissive.set(VOID_VIOLET);
    black.emissiveIntensity = 0.12;
    black.metalness = 0;
    black.roughness = 1;
    return black;
  }, [material]);
  useEffect(() => () => shade.dispose(), [shade]);
  const body = useRef<Group>(null);
  const answered = useRef<{ id: number; at: number } | null>(null);
  const at = useMemo(() => new Vector3(), []);
  const placed = useRef(false);
  const goal = useMemo(() => new Vector3(), []);
  const shown = useRef(0);
  const leg = useRef(-1);
  const heading = useRef(0);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (!placed.current && roam[0]) {
      at.set(...roam[0]);
      placed.current = true;
    }
    if (call && call.id !== answered.current?.id) answered.current = { id: call.id, at: time };
    const summoned = call && answered.current && time - answered.current.at < SURGE_SECONDS + 0.4 ? call.at : null;
    const legIndex = Math.floor(time / WANDER_SECONDS);
    if (!summoned && legIndex !== leg.current && roam.length > 0) {
      leg.current = legIndex;
      // A pseudo-random tile each leg, the same for every client at the same time.
      const pick = roam[Math.floor(Math.abs(Math.sin(legIndex * 12.9898) * 43758.5453) % roam.length)];
      goal.set(pick[0], pick[1], pick[2]);
    }
    if (summoned) goal.set(summoned[0], summoned[1], summoned[2]);
    const dx = goal.x - at.x;
    const dz = goal.z - at.z;
    at.lerp(goal, Math.min(1, delta * (summoned ? 4 : 0.35)));

    const phase = time % CYCLE_SECONDS;
    const roaming = phase < SHOWN_SECONDS ? Math.min(1, phase / 2, (SHOWN_SECONDS - phase) / 2) : 0;
    const target = summoned ? 1 : roaming;
    shown.current += (target - shown.current) * Math.min(1, delta * 3);
    shade.setValues({ opacity: shown.current });

    const node = body.current;
    if (!node) return;
    node.visible = shown.current > 0.02;
    // Faces where it drifts, leaning into it; the smoke breathes and sways as it goes.
    const travel = Math.hypot(dx, dz);
    if (travel > 0.05) heading.current += (Math.atan2(dx, dz) - heading.current) * Math.min(1, delta * 2);
    node.position.set(at.x, at.y + TAIL_CLEARANCE + WRAITH_HEIGHT / 2 + Math.sin(time * 1.3) * 0.12, at.z);
    node.rotation.set(Math.min(0.25, travel * 0.04), heading.current, Math.sin(time * 0.9) * 0.06, "YXZ");
    const breath = 1 + Math.sin(time * 2.1) * 0.03;
    node.scale.set(breath, 1 / breath, breath);
  });

  return (
    <group ref={body}>
      <Prop geometry={geometry} material={shade} height={WRAITH_HEIGHT} />
      <Sparkles count={24} scale={[1.8, 2.6, 1.8]} position-y={-0.4} size={3} speed={0.6} color={VOID_VIOLET} />
    </group>
  );
}
