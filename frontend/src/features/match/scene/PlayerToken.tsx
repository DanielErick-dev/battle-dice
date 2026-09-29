"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef } from "react";
import { MathUtils, Vector3, type Group, type Mesh } from "three";
import { AWAKENING_BONUS } from "@/game/domain/cards";
import type { DiceBoost } from "@/game/domain/types";
import type { CharacterClip, ClipLengths } from "../characters";
import { DEFAULT_TIMINGS } from "../config";
import type { CardCastView } from "../model/matchView";
import { TILE_HEIGHT, TILE_PITCH, type Vec3 } from "./boardLayout";
import { BoostOrb, HealBurst, ShieldBubble, WindCloud, type OrbPalette } from "./CardEffects";
import { AbilityBurst } from "./AbilityBurst";
import { Delayed, SwordImpact } from "./TrapSmash";
import { CharacterModel } from "./character/CharacterModel";
import { EnergyBlades } from "./character/EnergyBlades";
import { EFFECT_SCALE, FIGURE_HEIGHT } from "./character/figure";
import { EnergyAura } from "./EnergyAura";

interface PlayerTokenProps {
  /** Ring and placeholder colour. */
  color: string;
  /** The character's model; a plain capsule stands in without one (or while it loads). */
  model: string | null;
  target: Vec3;
  /** Which way the path runs at the target tile: the figure faces it after a leap or a knock-back. */
  pathDirection: Vec3;
  /** Next move is a portal/trap teleport: leap in an arc instead of running. */
  isTeleporting: boolean;
  isActive: boolean;
  /** Charged with energy: shows the aura. */
  isPowered: boolean;
  /** Arcane Shield up. */
  isShielded: boolean;
  /** Card modifier waiting for the next roll (Berserk Fury, Fate Rune…). */
  diceBoost: DiceBoost | null;
  /** Card this player just cast, for its one-shot effect. */
  cast: CardCastView | null;
  /** Changes every time the player uses their ability (null otherwise): the figure acts it out. */
  abilityCast: number | null;
  /** Blades of light in the figure's hands while it plays its cast clip. */
  energyBlades: boolean;
  /** When the cast clip's blow lands (null: the burst goes off at once, with no impact). */
  castImpactSeconds: number | null;
}

type Motion = "run" | "leap";

interface Waypoint {
  to: Vector3;
  teleport: boolean;
  /** Path direction at `to`. */
  path: Vector3;
}

interface Segment {
  from: Vector3;
  to: Vector3;
  path: Vector3;
  motion: Motion;
  progress: number;
  duration: number;
}

/** World units per second while running: one tile per playback step, so steps chain seamlessly. */
const RUN_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.stepMs / 1000);
/** Keeps the run cycle going this long after arriving, so brief stops between tiles don't flicker. */
const RUN_LINGER_SECONDS = 0.18;
const LEAP_SECONDS = 0.55;
const LEAP_SECONDS_PER_UNIT = 0.03;
/** Moves longer than this are never run, even without a teleport (e.g. restart). */
const MAX_RUN_DISTANCE = TILE_PITCH * 1.5;
const BASE_Y = TILE_HEIGHT / 2;
/** How quickly the figure turns towards where it's heading (higher = snappier). */
const TURN_RATE = 12;
/** Using an ability without a cast clip: a leap with a full spin, this long and high. */
const HOP_SECONDS = 0.7;
const HOP_HEIGHT = 0.9;
/** Seconds a cast clip's last pose is held before the figure settles back into its idle. */
const CAST_HOLD_SECONDS = 0.5;

/**
 * Follows the target tile by tile. Targets queue up as waypoints so a multi-tile move
 * reads as one continuous run instead of a hop per tile.
 */
export function PlayerToken({
  color,
  model,
  target,
  pathDirection,
  isTeleporting,
  isActive,
  isPowered,
  isShielded,
  diceBoost,
  cast,
  abilityCast,
  energyBlades,
  castImpactSeconds,
}: PlayerTokenProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const waypoints = useRef<Waypoint[]>([]);
  const segment = useRef<Segment | null>(null);
  const lastTarget = useRef<string | null>(null);
  /** Where the figure should face, as an angle around the vertical (0 = +z). */
  const heading = useRef<number | null>(null);
  const runLinger = useRef(0);
  const clip = useRef<CharacterClip>("idle");
  /** Length of the model's cast clip; null acts the ability out with a leap instead. */
  const castSeconds = useRef<number | null>(null);
  const onClipLengths = useCallback((lengths: ClipLengths) => {
    castSeconds.current = lengths.cast ?? null;
  }, []);
  /** Facing without the ability spin on top. */
  const yaw = useRef(0);
  /** The last ability use acted out, so each one plays once while its notice stays up. */
  const lastCast = useRef<number | null>(null);
  /** When the ability being acted out started (clock seconds); null when none is. */
  const castStartedAt = useRef<number | null>(null);
  /** On while the cast clip itself plays (not the hold after it), for its blades. */
  const bladesOut = useRef(false);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const key = target.join(",");
    if (lastTarget.current === null) {
      node.position.set(target[0], BASE_Y, target[2]);
      heading.current = headingOf(new Vector3(...pathDirection)) ?? 0;
    } else if (lastTarget.current !== key) {
      waypoints.current.push({
        to: new Vector3(target[0], BASE_Y, target[2]),
        teleport: isTeleporting,
        path: new Vector3(...pathDirection),
      });
    }
    lastTarget.current = key;

    if (!segment.current) segment.current = nextSegment(node.position, waypoints.current.shift());

    const current = segment.current;
    if (current) {
      if (current.progress === 0) {
        // A leap lands facing along the path, not back towards where it came from.
        const direction = current.motion === "leap" ? current.path : current.to.clone().sub(current.from);
        heading.current = headingOf(direction) ?? heading.current;
      }
      current.progress = Math.min(1, current.progress + delta / current.duration);

      if (current.motion === "run") {
        node.position.lerpVectors(current.from, current.to, current.progress);
      } else {
        const height = 1 + current.from.distanceTo(current.to) * 0.12;
        node.position.lerpVectors(current.from, current.to, easeInOut(current.progress));
        node.position.y = BASE_Y + Math.sin(Math.PI * current.progress) * height;
      }
      if (current.progress >= 1) {
        segment.current = null;
        // Come to rest facing along the path (after being pushed back, too).
        if (waypoints.current.length === 0) heading.current = headingOf(current.path) ?? heading.current;
      }
    }

    if (ring.current) {
      ring.current.scale.setScalar(isActive ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 1);
    }

    const now = state.clock.elapsedTime;
    if (abilityCast !== null && abilityCast !== lastCast.current) {
      lastCast.current = abilityCast;
      castStartedAt.current = now;
    }
    const castClip = castSeconds.current;
    // A cast clip's last pose lingers a moment before the figure settles back into its idle.
    const castLength = castClip === null ? HOP_SECONDS : castClip + CAST_HOLD_SECONDS;
    const castElapsed = castStartedAt.current === null ? Infinity : now - castStartedAt.current;
    const castProgress = Math.min(1, castElapsed / castLength);
    if (castProgress >= 1) castStartedAt.current = null;
    const isCasting = castStartedAt.current !== null;

    const moving = segment.current !== null;
    runLinger.current = moving ? RUN_LINGER_SECONDS : Math.max(0, runLinger.current - delta);
    // Sheathed as soon as the figure runs off (a roll can cut the cast short).
    bladesOut.current = castClip !== null && castElapsed < castClip && !moving;
    if (moving || runLinger.current > 0) clip.current = "run";
    else clip.current = isCasting && castClip !== null ? "cast" : "idle";

    if (heading.current !== null) yaw.current = turnTowards(yaw.current, heading.current, delta * TURN_RATE);
    if (body.current) {
      // Without a cast clip the figure acts the ability out itself: a leap with a full spin.
      const hop = isCasting && castClip === null ? castProgress : 0;
      body.current.position.y = Math.sin(Math.PI * hop) * HOP_HEIGHT;
      body.current.rotation.y = yaw.current + easeInOut(hop) * Math.PI * 2;
    }
  });

  return (
    <group ref={group}>
      {/* Effects around the figure, scaled to its size. */}
      <group scale={EFFECT_SCALE}>
        <EnergyAura active={isPowered || isAwakened(diceBoost)} />
        <EnergyAura active={diceBoost?.kind === "double"} palette="red" />
        {orbFor(diceBoost) && <BoostOrb palette={orbFor(diceBoost)!} />}
        {isShielded && <ShieldBubble />}
        {cast?.card.cardId === "windStep" && <WindCloud key={cast.id} />}
        {cast?.card.cardId === "healingHerb" && <HealBurst key={cast.id} />}
        {abilityCast !== null &&
          (castImpactSeconds === null ? (
            <AbilityBurst key={abilityCast} color={color} />
          ) : (
            <Delayed key={abilityCast} seconds={castImpactSeconds}>
              <AbilityBurst color={color} />
              <SwordImpact color={color} />
            </Delayed>
          ))}
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.62, 0.75, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.35} toneMapped={false} />
      </mesh>

      <group ref={body}>
        {model ? (
          <Suspense fallback={<Placeholder color={color} />}>
            <CharacterModel url={model} height={FIGURE_HEIGHT} clip={clip} onClipLengths={onClipLengths}>
              {energyBlades ? (figure) => <EnergyBlades figure={figure} color={color} active={bladesOut} /> : undefined}
            </CharacterModel>
          </Suspense>
        ) : (
          <Placeholder color={color} />
        )}
      </group>
    </group>
  );
}

function nextSegment(from: Vector3, waypoint: Waypoint | undefined): Segment | null {
  if (!waypoint) return null;

  const distance = from.distanceTo(waypoint.to);
  const motion: Motion = waypoint.teleport || distance > MAX_RUN_DISTANCE ? "leap" : "run";
  return {
    from: from.clone(),
    to: waypoint.to,
    path: waypoint.path,
    motion,
    progress: 0,
    duration: motion === "run" ? Math.max(distance / RUN_SPEED, 0.01) : LEAP_SECONDS + distance * LEAP_SECONDS_PER_UNIT,
  };
}

/** Angle around the vertical that faces along `direction` on the ground (models face +z), or null if it's straight up/down. */
function headingOf(direction: Vector3): number | null {
  if (Math.hypot(direction.x, direction.z) < 1e-4) return null;
  return Math.atan2(direction.x, direction.z);
}

/** Eases an angle towards a target the short way round. */
function turnTowards(angle: number, target: number, amount: number): number {
  const difference = MathUtils.euclideanModulo(target - angle + Math.PI, Math.PI * 2) - Math.PI;
  return angle + difference * Math.min(1, amount);
}

/** Stand-in figure while a model loads, or for a player without one. */
function Placeholder({ color }: { color: string }) {
  return (
    <mesh position-y={0.55} castShadow>
      <capsuleGeometry args={[0.24, 0.5, 8, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.35} />
    </mesh>
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Ancestral Awakening shows as the golden aura for as long as its bonus lasts. */
function isAwakened(boost: DiceBoost | null): boolean {
  return boost?.kind === "bonus" && boost.amount === AWAKENING_BONUS;
}

function orbFor(boost: DiceBoost | null): OrbPalette | null {
  if (boost?.kind === "fixed") return "fate";
  if (boost?.kind === "best") return "oracle";
  if (boost?.kind === "bonus" && !isAwakened(boost)) return "luck";
  return null;
}
