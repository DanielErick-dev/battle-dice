"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState } from "react";
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
import { ElectricField } from "./character/ElectricField";
import { EnergyBlades } from "./character/EnergyBlades";
import { LimbLightning } from "./character/LimbLightning";
import { LevitationAura, LevitationBurst, levitationLift, stepLevitation } from "./character/Levitation";
import { HeldVial, VialShatter } from "./character/AlchemyVial";
import { WitchStaff } from "./character/WitchStaff";
import { EFFECT_SCALE, FIGURE_HEIGHT, LEVITATE_HEIGHT } from "./character/figure";
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
  /** The character's own tint for the shield bubble; the usual cyan without one. */
  shieldColor?: string;
  /** Crossing the board as lightning (Dormant Fury): unseen, racing from tile to tile. */
  isDashing: boolean;
  /** Dormant Fury awake, waiting for the roll: a field of electricity crackles around the figure. */
  isFuryAwake: boolean;
  /** Levitating: hovers above the tiles with a staff in hand, and glides instead of running. */
  isLevitating: boolean;
  /** Card modifier waiting for the next roll (Berserk Fury, Fate Rune…). */
  diceBoost: DiceBoost | null;
  /** Card this player just cast, for its one-shot effect. */
  cast: CardCastView | null;
  /** Changes every time the player uses their ability (null otherwise): the figure acts it out. */
  abilityCast: number | null;
  /** Blades of light in the figure's hands while it plays its cast clip. */
  energyBlades: boolean;
  /**
   * Lightning off the figure's hands and feet: sparks while Dormant Fury waits for the roll,
   * bolts trailing the limbs as it throws itself into the dash and drops out of it.
   */
  limbLightning: boolean;
  /** Uses the ability without moving: no cast clip, no leap, no burst. */
  castsStill?: boolean;
  /** When the land clip's feet touch the ground, out of a dash: the shockwave goes off. */
  landImpactSeconds?: number;
  /** When the cast clip's blow lands (null: the burst goes off at once, with no impact). */
  castImpactSeconds: number | null;
  /** A prop made in code the figure holds while casting, then throws (the vial): replaces the leap and burst. */
  handProp?: "vial";
  /** When the cast clip takes the hand prop out (it's thrown at castImpactSeconds). */
  castPropSeconds?: number;
}

type Motion = "run" | "leap" | "dash";

interface Waypoint {
  to: Vector3;
  teleport: boolean;
  dash: boolean;
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
/** The same for a lightning dash: a tile per dash step. */
const DASH_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.dashStepMs / 1000);
/**
 * Into a dash, when the strike takes the figure (it's gone from then until it arrives): it
 * throws itself forward first (its dash clip), then the bolt lands on it.
 */
const DASH_VANISH_SECONDS = DEFAULT_TIMINGS.dashLaunchMs / 1000 + 0.1;
/** Out of a land clip's impact, how long the lightning keeps trailing the limbs. */
const LAND_CRACKLE_SECONDS = 0.4;
/** Keeps the run cycle going this long after arriving, so brief stops between tiles don't flicker. */
const RUN_LINGER_SECONDS = 0.18;
const LEAP_SECONDS = 0.55;
const LEAP_SECONDS_PER_UNIT = 0.03;
/** Moves longer than this are never run, even without a teleport (e.g. restart). */
const MAX_RUN_DISTANCE = TILE_PITCH * 1.5;
/** The figure stands on top of its tile, wherever the tile sits (realm tracks float or sink). */
const BASE_Y = TILE_HEIGHT / 2;
/** How quickly the figure turns towards where it's heading (higher = snappier). */
const TURN_RATE = 12;
/** Using an ability without a cast clip: a leap with a full spin, this long and high. */
const HOP_SECONDS = 0.7;
const HOP_HEIGHT = 0.9;
/** Seconds a cast clip's last pose is held before the figure settles back into its idle. */
const CAST_HOLD_SECONDS = 0.5;
/** How much a levitating figure bobs once up. */
const LEVITATE_BOB = 0.12;

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
  isDashing,
  isFuryAwake,
  isActive,
  isPowered,
  isShielded,
  shieldColor,
  isLevitating,
  diceBoost,
  cast,
  abilityCast,
  energyBlades,
  limbLightning,
  castsStill = false,
  landImpactSeconds = 0,
  castImpactSeconds,
  handProp,
  castPropSeconds = 0,
}: PlayerTokenProps) {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  /** Effects on the figure itself (shield, auras, orbs, casts): they rise with it when it levitates. */
  const effects = useRef<Group>(null);
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
  /** Length of the model's land clip; null without one (the figure just reappears out of a dash). */
  const landSeconds = useRef<number | null>(null);
  const onClipLengths = useCallback((lengths: ClipLengths) => {
    castSeconds.current = lengths.cast ?? null;
    landSeconds.current = lengths.land ?? null;
  }, []);
  /** When the figure came out of its last dash (clock seconds), to land; null when not landing. */
  const landStartedAt = useRef<number | null>(null);
  /** Set as the figure lands out of a dash, to fire its shockwave once. */
  const [landing, setLanding] = useState<number | null>(null);
  /** Read by the limb lightning every frame: bolts trailing the limbs, sparks in the hands. */
  const crackling = useRef(false);
  const charged = useRef(false);
  /** Facing without the ability spin on top. */
  const yaw = useRef(0);
  /** The last ability use acted out, so each one plays once while its notice stays up. */
  const lastCast = useRef<number | null>(null);
  /** When the ability being acted out started (clock seconds); null when none is. */
  const castStartedAt = useRef<number | null>(null);
  /** On while the cast clip itself plays (not the hold after it), for its blades. */
  const bladesOut = useRef(false);
  /** On while the hand prop is held, before the cast throws it. */
  const propHeld = useRef(false);
  /** Levitation progress: 0 on the ground, 1 hovering at LEVITATE_HEIGHT. */
  const rise = useRef(0);
  /** Read by the staff every frame; kept in step with isLevitating by the frame loop. */
  const levitating = useRef(false);
  /** When the current dash started (clock seconds); null when not dashing. */
  const dashStartedAt = useRef<number | null>(null);

  useFrame((state, delta) => {
    const node = group.current;
    levitating.current = isLevitating;
    if (!node) return;

    const key = target.join(",");
    if (lastTarget.current === null) {
      node.position.set(target[0], target[1] + BASE_Y, target[2]);
      heading.current = headingOf(new Vector3(...pathDirection)) ?? 0;
    } else if (lastTarget.current !== key) {
      waypoints.current.push({
        to: new Vector3(target[0], target[1] + BASE_Y, target[2]),
        teleport: isTeleporting,
        dash: isDashing,
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

      if (current.motion !== "leap") {
        node.position.lerpVectors(current.from, current.to, current.progress);
      } else {
        const height = 1 + current.from.distanceTo(current.to) * 0.12;
        node.position.lerpVectors(current.from, current.to, easeInOut(current.progress));
        // Arcs over the straight line between the two tiles' tops, whatever their heights.
        node.position.y += Math.sin(Math.PI * current.progress) * height;
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
    if (!isDashing) {
      // Out of the dash: the figure drops out of the strike and lands (when it has a land clip).
      if (dashStartedAt.current !== null && landSeconds.current !== null) {
        landStartedAt.current = now;
        setLanding(now);
      }
      dashStartedAt.current = null;
    } else dashStartedAt.current ??= now;
    // Throwing itself forward, then taken by the lightning: only the bolt is seen until it lets go.
    const hidden = dashStartedAt.current !== null && now - dashStartedAt.current >= DASH_VANISH_SECONDS;
    const launching = dashStartedAt.current !== null && !hidden;
    const landElapsed = landStartedAt.current === null ? Infinity : now - landStartedAt.current;
    if (landElapsed >= (landSeconds.current ?? 0) + CAST_HOLD_SECONDS) landStartedAt.current = null;
    const landed = landStartedAt.current !== null;
    crackling.current = launching || landElapsed < landImpactSeconds + LAND_CRACKLE_SECONDS;
    charged.current = isFuryAwake;
    if (body.current) body.current.visible = !hidden;
    if (ring.current) ring.current.visible = !hidden;
    if (effects.current) effects.current.visible = !hidden;
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
    // Sent on (a trap where the dash ended): the landing is over, not to be played again after.
    if (moving) landStartedAt.current = null;
    runLinger.current = moving ? RUN_LINGER_SECONDS : Math.max(0, runLinger.current - delta);
    // Sheathed as soon as the figure runs off (a roll can cut the cast short).
    bladesOut.current = castClip !== null && castElapsed < castClip && !moving;
    propHeld.current =
      castClip !== null && castElapsed >= castPropSeconds && castElapsed < (castImpactSeconds ?? castClip) && !moving;
    // Levitating, the figure glides from tile to tile in its float pose instead of running.
    const rest = isLevitating ? "float" : "idle";
    if (launching) clip.current = "dash";
    else if (landed && !moving) clip.current = "land";
    else if (moving || runLinger.current > 0) clip.current = isLevitating ? "float" : "run";
    else clip.current = isCasting && castClip !== null && !castsStill ? "cast" : rest;

    rise.current = stepLevitation(rise.current, isLevitating, delta);
    const lift = levitationLift(rise.current);
    const hover = lift * LEVITATE_HEIGHT + Math.sin(now * 1.6) * LEVITATE_BOB * lift;

    if (heading.current !== null) yaw.current = turnTowards(yaw.current, heading.current, delta * TURN_RATE);
    if (body.current) {
      // Without a cast clip the figure acts the ability out itself: a leap with a full spin
      // (unless it's rising into a levitation, which is show enough).
      const hop = isCasting && castClip === null && !isLevitating && !handProp && !castsStill ? castProgress : 0;
      body.current.position.y = Math.sin(Math.PI * hop) * HOP_HEIGHT + hover;
      body.current.rotation.y = yaw.current + easeInOut(hop) * Math.PI * 2;
    }
    if (effects.current) effects.current.position.y = hover;
  });

  return (
    <group ref={group}>
      {/* Effects around the figure, scaled to its size and following it up when it levitates. */}
      <group ref={effects} scale={EFFECT_SCALE}>
        <EnergyAura active={isPowered || isAwakened(diceBoost)} />
        <EnergyAura active={diceBoost?.kind === "double"} palette="red" />
        {orbFor(diceBoost) && <BoostOrb palette={orbFor(diceBoost)!} />}
        {isShielded && <ShieldBubble color={shieldColor} />}
        {cast?.card.cardId === "windStep" && <WindCloud key={cast.id} />}
        {cast?.card.cardId === "healingHerb" && <HealBurst key={cast.id} />}
        {abilityCast !== null &&
          !isLevitating &&
          !handProp &&
          !castsStill &&
          (castImpactSeconds === null ? (
            <AbilityBurst key={abilityCast} color={color} />
          ) : (
            <Delayed key={abilityCast} seconds={castImpactSeconds}>
              <AbilityBurst color={color} />
              <SwordImpact color={color} />
            </Delayed>
          ))}
      </group>
      <ElectricField active={isFuryAwake} color={color} size={FIGURE_HEIGHT} />
      {/* Out of a dash, the shockwave as the feet touch the ground. */}
      {landing !== null && (
        <group scale={EFFECT_SCALE}>
          <Delayed key={landing} seconds={landImpactSeconds}>
            <AbilityBurst color={color} />
            <SwordImpact color={color} />
          </Delayed>
        </group>
      )}
      <LevitationAura size={FIGURE_HEIGHT} color={color} progress={rise} height={LEVITATE_HEIGHT} />
      {abilityCast !== null && isLevitating && <LevitationBurst key={abilityCast} size={FIGURE_HEIGHT} color={color} />}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.62, 0.75, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.35} toneMapped={false} />
      </mesh>

      <group ref={body}>
        {model ? (
          <Suspense fallback={<Placeholder color={color} />}>
            <CharacterModel url={model} height={FIGURE_HEIGHT} clip={clip} onClipLengths={onClipLengths}>
              {(figure) => (
                <>
                  {energyBlades && <EnergyBlades figure={figure} color={color} active={bladesOut} />}
                  {limbLightning && (
                    <LimbLightning
                      figure={figure}
                      size={FIGURE_HEIGHT}
                      color={color}
                      active={crackling}
                      charged={charged}
                    />
                  )}
                  <WitchStaff figure={figure} color={color} active={levitating} />
                  {handProp === "vial" && <HeldVial figure={figure} color={color} active={propHeld} />}
                </>
              )}
            </CharacterModel>
          </Suspense>
        ) : (
          <Placeholder color={color} />
        )}
        {/* In the figure's frame, so the vial is thrown the way it faces. */}
        {abilityCast !== null && handProp === "vial" && (
          <Delayed key={abilityCast} seconds={castImpactSeconds ?? 0}>
            <VialShatter size={FIGURE_HEIGHT} color={color} />
          </Delayed>
        )}
      </group>
    </group>
  );
}

function nextSegment(from: Vector3, waypoint: Waypoint | undefined): Segment | null {
  if (!waypoint) return null;

  const distance = from.distanceTo(waypoint.to);
  // A dash goes straight through, even round a track's bends.
  const motion: Motion = waypoint.dash ? "dash" : waypoint.teleport || distance > MAX_RUN_DISTANCE ? "leap" : "run";
  const speed = motion === "dash" ? DASH_SPEED : RUN_SPEED;
  return {
    from: from.clone(),
    to: waypoint.to,
    path: waypoint.path,
    motion,
    progress: 0,
    duration: motion === "leap" ? LEAP_SECONDS + distance * LEAP_SECONDS_PER_UNIT : Math.max(distance / speed, 0.01),
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
