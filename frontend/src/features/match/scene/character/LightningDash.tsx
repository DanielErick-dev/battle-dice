"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  CurvePath,
  LineCurve3,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { DEFAULT_TIMINGS } from "../../config";
import { TILE_HEIGHT, TILE_PITCH, type Vec3 } from "../boardLayout";
import { useAge } from "../useAge";
import { CHEST_HEIGHT } from "./figure";

/** Where the bolt runs along the path: through the figure's chest. */
const BOLT_HEIGHT = TILE_HEIGHT / 2 + CHEST_HEIGHT * 0.8;
/** Kinks the bolt takes between two tiles, and how far they stray from the straight line. */
const KINKS_PER_TILE = 4;
const KINK_SPREAD = TILE_PITCH * 0.16;
/** A strike from the sky: where it starts, how long it takes to reach the ground and to fade. */
const SKY_HEIGHT = 16;
const STRIKE_DROP_SECONDS = 0.09;
const STRIKE_FADE_SECONDS = 0.5;
/** How long the trail flickers on once the dash is over. */
const TRAIL_FADE_SECONDS = 0.8;
/** Times per second the bolt jumps between its two shapes. */
const FLICKER_RATE = 22;
const RING_SECONDS = 0.7;

const LAUNCH_SECONDS = DEFAULT_TIMINGS.dashLaunchMs / 1000;
const STRIKE_SECONDS = DEFAULT_TIMINGS.dashStrikeMs / 1000;
const STEP_SECONDS = DEFAULT_TIMINGS.dashStepMs / 1000;

/**
 * Dormant Fury's dash, in world space: once the player has thrown themselves forward (dashLaunchMs),
 * lightning strikes them where they stand, a bolt
 * races along every tile they cross (as fast as the token), and another strike drops on the tile
 * where they step out of it. Timed like the playback (DEFAULT_TIMINGS); mounted with a fresh key
 * per dash, it fades itself out.
 */
export function LightningDash({ path, color }: { path: readonly Vec3[]; color: string }) {
  const travelSeconds = Math.max(1, path.length - 1) * STEP_SECONDS;
  const strikeAt = LAUNCH_SECONDS;
  const arriveAt = strikeAt + STRIKE_SECONDS + travelSeconds;
  const start = path[0];
  const end = path.at(-1) ?? start;

  return (
    <group>
      <SkyStrike position={start} color={color} at={strikeAt} />
      <GroundTrail path={path} color={color} from={strikeAt + STRIKE_SECONDS} seconds={travelSeconds} />
      <SkyStrike position={end} color={color} at={arriveAt} />
    </group>
  );
}

function GroundTrail({
  path,
  color,
  from,
  seconds,
}: {
  path: readonly Vec3[];
  color: string;
  from: number;
  seconds: number;
}) {
  const points = useMemo(() => path.map(([x, , z]) => new Vector3(x, BOLT_HEIGHT, z)), [path]);
  const age = useAge();
  const shapes = useMemo(() => [newDrive(), newDrive()], []);
  const head = useRef<Mesh>(null);
  const headMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.2), [color]);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) - from;
    const progress = Math.min(1, Math.max(0, t / seconds));
    const fade = t < seconds ? 1 : Math.max(0, 1 - (t - seconds) / TRAIL_FADE_SECONDS);
    const shown = t >= 0 && fade > 0;
    const flicker = Math.floor(clock.elapsedTime * FLICKER_RATE) % 2;
    shapes.forEach((bolt, index) => {
      // While it races on, the bolt is drawn up to its head; then it flickers between shapes.
      bolt.progress = progress;
      bolt.opacity = shown && (t < seconds || index === flicker) ? fade : 0;
    });
    if (head.current && headMaterial.current) {
      head.current.visible = t >= 0 && t < seconds;
      head.current.position.copy(pointAlong(points, progress));
      head.current.scale.setScalar(0.8 + Math.sin(clock.elapsedTime * 60) * 0.25);
    }
  });

  return (
    <group>
      {[0, 1].map((index) => (
        <BoltMesh key={index} drive={shapes[index]} points={points} color={color} seed={index + 1} />
      ))}
      <mesh ref={head}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshBasicMaterial
          ref={headMaterial}
          color={glow}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** A bolt from the sky onto a tile, with a flash and a ring racing out over the ground. */
function SkyStrike({ position, color, at }: { position: Vec3; color: string; at: number }) {
  const [x, , z] = position;
  const points = useMemo(() => [new Vector3(x, SKY_HEIGHT, z), new Vector3(x, TILE_HEIGHT / 2, z)], [x, z]);
  const age = useAge();
  const bolts = useMemo(() => [newDrive(), newDrive()], []);
  const root = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const flash = useRef<Mesh>(null);
  const flashMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.6), [color]);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) - at;
    const done = t > Math.max(STRIKE_DROP_SECONDS + STRIKE_FADE_SECONDS, RING_SECONDS);
    if (root.current) root.current.visible = t >= 0 && !done;
    if (t < 0 || done) return;

    const drop = Math.min(1, t / STRIKE_DROP_SECONDS);
    const fade = t < STRIKE_DROP_SECONDS ? 1 : Math.max(0, 1 - (t - STRIKE_DROP_SECONDS) / STRIKE_FADE_SECONDS);
    const flicker = Math.floor(clock.elapsedTime * FLICKER_RATE) % 2;
    bolts.forEach((bolt, index) => {
      bolt.progress = drop;
      bolt.opacity = drop < 1 || index === flicker ? fade : fade * 0.3;
    });

    const spread = Math.min(1, t / RING_SECONDS);
    ring.current?.scale.setScalar(0.4 + (1 - (1 - spread) ** 3) * 3.2);
    if (ringMaterial.current) ringMaterial.current.opacity = drop < 1 ? 0 : 0.9 * (1 - spread);
    flash.current?.scale.setScalar(1 + (1 - fade) * 1.5);
    if (flashMaterial.current) flashMaterial.current.opacity = drop < 1 ? 0 : 0.7 * fade ** 2;
  });

  return (
    <group ref={root} visible={false}>
      {[0, 1].map((index) => (
        <BoltMesh
          key={index}
          drive={bolts[index]}
          points={points}
          color={color}
          seed={index + 7}
          kinks={10}
          spread={0.55}
          width={1.6}
        />
      ))}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[x, TILE_HEIGHT / 2 + 0.04, z]}>
        <ringGeometry args={[0.55, 0.72, 48]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={flash} position={[x, TILE_HEIGHT / 2 + CHEST_HEIGHT * 0.5, z]}>
        <sphereGeometry args={[1.1, 20, 14]} />
        <meshBasicMaterial
          ref={flashMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** What a bolt shows this frame, written by its effect: drawn up to `progress` (0–1) of its length. */
interface BoltDrive {
  progress: number;
  opacity: number;
}

const newDrive = (): BoltDrive => ({ progress: 0, opacity: 0 });

interface BoltMeshProps {
  drive: BoltDrive;
  points: readonly Vector3[];
  color: string;
  /** Picks the bolt's kinks: two seeds give two shapes to flicker between. */
  seed: number;
  /** Kinks between each two points. */
  kinks?: number;
  /** How far the kinks stray from the straight line, in world units. */
  spread?: number;
  /** Thickness multiplier. */
  width?: number;
}

/** A jagged bolt through `points`: a white-hot core in a coloured glow. */
function BoltMesh({
  drive,
  points,
  color,
  seed,
  kinks = KINKS_PER_TILE,
  spread = KINK_SPREAD,
  width = 1,
}: BoltMeshProps) {
  const core = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const coreMaterial = useRef<MeshBasicMaterial>(null);
  const haloMaterial = useRef<MeshBasicMaterial>(null);
  const geometries = useMemo(() => {
    const curve = jaggedCurve(points, kinks, spread, seed);
    const segments = Math.max(8, (points.length - 1) * kinks * 3);
    return {
      core: new TubeGeometry(curve, segments, 0.05 * width, 5, false),
      halo: new TubeGeometry(curve, segments, 0.2 * width, 6, false),
    };
  }, [points, kinks, spread, seed, width]);
  useEffect(
    () => () => {
      geometries.core.dispose();
      geometries.halo.dispose();
    },
    [geometries],
  );
  const coreColor = useMemo(() => new Color("#ffffff").lerp(new Color(color), 0.25).multiplyScalar(3), [color]);
  const haloColor = useMemo(() => new Color(color).multiplyScalar(1.8), [color]);

  useFrame(() => {
    for (const mesh of [core.current, halo.current]) {
      if (!mesh) continue;
      const indices = mesh.geometry.index?.count ?? 0;
      // Tube indices run along the curve, six per quad: cut on a whole quad.
      mesh.geometry.setDrawRange(0, Math.floor((indices * drive.progress) / 6) * 6);
    }
    if (coreMaterial.current) coreMaterial.current.opacity = drive.opacity;
    if (haloMaterial.current) haloMaterial.current.opacity = drive.opacity * 0.45;
  });

  return (
    <group>
      <mesh ref={halo} geometry={geometries.halo} frustumCulled={false}>
        <meshBasicMaterial
          ref={haloMaterial}
          color={haloColor}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={core} geometry={geometries.core} frustumCulled={false}>
        <meshBasicMaterial
          ref={coreMaterial}
          color={coreColor}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** A zigzag through `points`: each leg broken into `kinks` straight pieces, strayed at random. */
function jaggedCurve(points: readonly Vector3[], kinks: number, spread: number, seed: number): CurvePath<Vector3> {
  const random = mulberry(seed);
  const jagged: Vector3[] = [points[0].clone()];
  for (let leg = 1; leg < points.length; leg++) {
    const from = points[leg - 1];
    const to = points[leg];
    for (let kink = 1; kink <= kinks; kink++) {
      const point = from.clone().lerp(to, kink / kinks);
      // The last point of each leg stays on the tile, so the bolt passes over every tile.
      if (kink < kinks)
        point.add(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(spread * 2));
      jagged.push(point);
    }
  }
  const curve = new CurvePath<Vector3>();
  for (let i = 1; i < jagged.length; i++) curve.add(new LineCurve3(jagged[i - 1], jagged[i]));
  return curve;
}

function pointAlong(points: readonly Vector3[], progress: number): Vector3 {
  if (points.length === 1) return points[0];
  const scaled = progress * (points.length - 1);
  const leg = Math.min(points.length - 2, Math.floor(scaled));
  return points[leg].clone().lerp(points[leg + 1], scaled - leg);
}

/** Small seeded generator, so a bolt keeps its shape across renders. */
function mulberry(seed: number): () => number {
  let state = seed * 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
