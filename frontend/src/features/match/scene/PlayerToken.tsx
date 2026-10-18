"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useCallback, useRef, useState } from "react";
import { MathUtils, Vector3, type Group, type Mesh } from "three";
import { isFallen } from "@/game/domain/seraph";
import type { Player } from "@/game/domain/types";
import type { CharacterClip, CharacterDefinition, ClipLengths } from "../characters";
import { DEFAULT_TIMINGS } from "../config";
import { TILE_HEIGHT, TILE_PITCH, TILE_SIZE, type Vec3 } from "./boardLayout";
import { CharacterModel } from "./character/CharacterModel";
import { EFFECT_SCALE, FIGURE_HEIGHT, LEVITATE_HEIGHT } from "./character/figure";
import { NameTag } from "./character/NameTag";
import { RestChair } from "./character/RestChair";
import { KNOCKED_LANDING_SECONDS, LUNGE_DISTANCE, LUNGE_SECONDS } from "./effects/berserker";
import { TOKEN_EFFECTS, type TokenFx, type TokenSignals } from "./effects";
import { levitationLift, stepLevitation } from "./character/Levitation";

interface PlayerTokenProps {
  player: Player;
  character: CharacterDefinition | null;
  /** Ring and placeholder colour. */
  color: string;
  target: Vec3;
  /** Which way the path runs at the target tile: the figure faces it after a leap or a knock-back. */
  pathDirection: Vec3;
  signals: TokenSignals;
  /** Filled every frame with the frost wand's tip (her snow streams from there). */
  wandTip?: Vector3;
  /** "J2 Bruxa" over the head; the seat lifts tags of figures sharing a tile apart. */
  nameTag?: { text: string; seat: number };
}

/** A slide: making room on its own tile, without getting up or turning (seated on its chair). */
type Motion = "run" | "leap" | "dash" | "slide";

interface Waypoint {
  to: Vector3;
  teleport: boolean;
  dash: boolean;
  /** Seated when sent there: a shift on its own tile slides the chair over instead of a run. */
  seated: boolean;
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

/** A seated figure making room on its own tile: as far as that can be, and how long it takes. */
const SLIDE_DISTANCE = TILE_SIZE * 0.8;
const SLIDE_SECONDS = 0.4;
/** One tile per playback step, so steps chain seamlessly. */
const RUN_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.stepMs / 1000);
const DASH_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.dashStepMs / 1000);
/** The figure throws itself forward (its dash clip) before the bolt takes it out of sight. */
const DASH_VANISH_SECONDS = DEFAULT_TIMINGS.dashLaunchMs / 1000 + 0.1;
/** Out of a land clip's impact, how long the lightning keeps trailing the limbs. */
const LAND_CRACKLE_SECONDS = 0.4;
/** So brief stops between tiles don't flicker out of the run cycle. */
const RUN_LINGER_SECONDS = 0.18;
/** Name tag height in the effects' units (a figure stands 1.9 tall), raised per seat so shared tiles don't pile up. */
const TAG_HEIGHT = 2;
const TAG_STAGGER = 0.32;
const LEAP_SECONDS = 0.55;
const LEAP_SECONDS_PER_UNIT = 0.03;
/** Longer moves are never run, even without a teleport (e.g. restart). */
const MAX_RUN_DISTANCE = TILE_PITCH * 1.5;
/** On top of its tile, wherever the tile sits (realm tracks float or sink). */
const BASE_Y = TILE_HEIGHT / 2;
const TURN_RATE = 12;
/** Using an ability without a cast clip: a leap with a full spin. */
const HOP_SECONDS = 0.7;
const HOP_HEIGHT = 0.9;
/** A cast clip's last pose is held this long before settling into idle. */
const CAST_HOLD_SECONDS = 0.5;
const LEVITATE_BOB = 0.12;
/** Sent flying without a knocked clip: how far back the figure reels (radians). */
const KNOCKED_TILT = 0.9;
/** Hell's Drag: dragged under, then climbing back out in hell. */
const SINK_SECONDS = DEFAULT_TIMINGS.dragSinkMs / 1000;
const EMERGE_SECONDS = 0.7;
const SINK_DEPTH = FIGURE_HEIGHT * 1.1;

/**
 * A player's figure: follows its target tile by tile (queued as waypoints so a long move reads as
 * one run), picks the clip to play, and mounts the effects in TOKEN_EFFECTS around it.
 */
export function PlayerToken({
  player,
  character,
  color,
  target,
  pathDirection,
  signals,
  wandTip,
  nameTag,
}: PlayerTokenProps) {
  const { isTeleporting, isDashing, isFuryAwake, isActive, isResting, shove, knocked, hop, dragged, abilityCast } =
    signals;
  const isLevitating = player.levitating > 0;
  const castsStill = character?.castsStill ?? false;
  const landImpactSeconds = character?.landImpactSeconds ?? 0;
  const castImpactSeconds = character?.castImpactSeconds ?? null;
  const castPropSeconds = character?.castPropSeconds ?? 0;
  const handProp = character?.handProp;
  const wand = character?.wand ?? false;
  const fallen = isFallen(player);
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  /** Rises with the figure when it levitates. */
  const effects = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const waypoints = useRef<Waypoint[]>([]);
  const segment = useRef<Segment | null>(null);
  const lastTarget = useRef<string | null>(null);
  /** Angle round the vertical (0 = +z). */
  const heading = useRef<number | null>(null);
  const runLinger = useRef(0);
  const clip = useRef<CharacterClip>("idle");
  // Clip lengths; null without the clip (the ability is a leap, the dash just ends, the shove a lunge...).
  const castSeconds = useRef<number | null>(null);
  const landSeconds = useRef<number | null>(null);
  const shoveSeconds = useRef<number | null>(null);
  const knockedSeconds = useRef<number | null>(null);
  const hopSeconds = useRef<number | null>(null);
  const [canRest, setCanRest] = useState(false);
  const seated = useRef(false);
  const onClipLengths = useCallback((lengths: ClipLengths) => {
    setCanRest(lengths.rest !== undefined);
    castSeconds.current = lengths.cast ?? null;
    landSeconds.current = lengths.land ?? null;
    shoveSeconds.current = lengths.shove ?? null;
    knockedSeconds.current = lengths.knocked ?? null;
    hopSeconds.current = lengths.hop ?? null;
  }, []);
  // Clock seconds each act started at; the `last*` refs make each id play once.
  const hopStartedAt = useRef<number | null>(null);
  const lastHop = useRef<number | null>(null);
  const shoveStartedAt = useRef<number | null>(null);
  const knockedStartedAt = useRef<number | null>(null);
  const lastShove = useRef<number | null>(null);
  /** Waiting for the Berserker to reach his spot ahead of them. */
  const shovePending = useRef(false);
  const lastKnocked = useRef<number | null>(null);
  const landStartedAt = useRef<number | null>(null);
  // Latched as each act starts, so its burst fires once and outlives the signal.
  const [hopBurst, setHopBurst] = useState<number | null>(null);
  const [shoveAt, setShoveAt] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const crackling = useRef(false);
  const charged = useRef(false);
  /** Facing without the ability spin on top. */
  const yaw = useRef(0);
  const lastCast = useRef<number | null>(null);
  const castStartedAt = useRef<number | null>(null);
  const bladesOut = useRef(false);
  const propHeld = useRef(false);
  const wandOut = useRef(false);
  const rise = useRef(0);
  const levitating = useRef(false);
  const drag = useRef<{
    stage: "sinking" | "gone" | "emerging";
    since: number;
    id: number;
  } | null>(null);
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
        seated: seated.current,
        path: new Vector3(...pathDirection),
      });
    }
    lastTarget.current = key;

    if (!segment.current) segment.current = nextSegment(node.position, waypoints.current.shift());

    const current = segment.current;
    if (current) {
      if (current.progress === 0 && current.motion !== "slide") {
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
        if (waypoints.current.length === 0 && current.motion !== "slide") {
          heading.current = headingOf(current.path) ?? heading.current;
        }
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
    // Hell's Drag: under once the hand sinks, gone while carried off, then out of hell's tile.
    if (dragged?.phase === "sink" && drag.current?.id !== dragged.id)
      drag.current = { stage: "sinking", since: now, id: dragged.id };
    let sunk = 0;
    if (drag.current) {
      const elapsed = now - drag.current.since;
      if (drag.current.stage === "sinking") {
        sunk = Math.min(1, elapsed / SINK_SECONDS) ** 2;
        if (elapsed >= SINK_SECONDS) drag.current = { ...drag.current, stage: "gone", since: now };
      } else if (drag.current.stage === "gone") {
        sunk = 1;
        if (dragged?.phase !== "sink" && segment.current === null && waypoints.current.length === 0)
          drag.current = { ...drag.current, stage: "emerging", since: now };
      } else {
        sunk = 1 - easeInOut(Math.min(1, elapsed / EMERGE_SECONDS));
        if (elapsed >= EMERGE_SECONDS) drag.current = null;
      }
    }
    const gone = drag.current?.stage === "gone";
    if (body.current) body.current.visible = !hidden && !gone;
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

    // A trample: the Berserker reaches his spot, turns on them and shoves, then faces the path again.
    if (shove !== lastShove.current) {
      shovePending.current = shove !== null;
      if (shove === null) {
        shoveStartedAt.current = null;
        heading.current = headingOf(new Vector3(...pathDirection)) ?? heading.current;
      }
    }
    lastShove.current = shove;
    if (shovePending.current && segment.current === null && waypoints.current.length === 0) {
      shovePending.current = false;
      shoveStartedAt.current = now;
      setShoveAt(now);
    }
    if (shoveStartedAt.current !== null) {
      heading.current = headingOf(new Vector3(...pathDirection).negate()) ?? heading.current;
    }
    if (knocked !== null && knocked !== lastKnocked.current) knockedStartedAt.current = now;
    lastKnocked.current = knocked;
    // Sent on its way again before it's back on its feet (its own turn): it gets up at once.
    if (knocked === null && current !== null && current.motion !== "leap") knockedStartedAt.current = null;
    const shoveElapsed = shoveStartedAt.current === null ? Infinity : now - shoveStartedAt.current;
    const knockedElapsed = knockedStartedAt.current === null ? Infinity : now - knockedStartedAt.current;
    const knockedLength = Math.max(knockedSeconds.current ?? 0, KNOCKED_LANDING_SECONDS) + CAST_HOLD_SECONDS;
    if (knockedElapsed >= knockedLength) knockedStartedAt.current = null;
    const shoving = shoveStartedAt.current !== null && shoveSeconds.current !== null;
    const reeling = knockedStartedAt.current !== null;
    if (hop !== null && hop !== lastHop.current) {
      hopStartedAt.current = now;
      setHopBurst(hop);
    }
    lastHop.current = hop;
    const hopElapsed = hopStartedAt.current === null ? Infinity : now - hopStartedAt.current;
    if (hopSeconds.current === null || hopElapsed >= hopSeconds.current) hopStartedAt.current = null;
    const hopping = hopStartedAt.current !== null;

    // Sliding over on its own tile (someone came by), a seated figure stays seated.
    const moving = segment.current !== null && segment.current.motion !== "slide";
    // Sent on (a trap where the dash ended): the landing is over, not to be played again after.
    if (moving) landStartedAt.current = null;
    runLinger.current = moving ? RUN_LINGER_SECONDS : Math.max(0, runLinger.current - delta);
    // Sheathed as soon as the figure runs off (a roll can cut the cast short).
    bladesOut.current = castClip !== null && castElapsed < castClip && !moving;
    propHeld.current =
      castClip !== null && castElapsed >= castPropSeconds && castElapsed < (castImpactSeconds ?? castClip) && !moving;
    wandOut.current = isCasting && !moving;
    seated.current = canRest && isResting && !isLevitating && !moving && !isCasting && !reeling && !gone;
    const rest = isLevitating ? "float" : seated.current ? "rest" : "idle";
    if (reeling && knockedSeconds.current !== null) clip.current = "knocked";
    else if (hopping && segment.current === null) clip.current = "hop";
    else if (shoving && !moving) clip.current = "shove";
    else if (launching) clip.current = "dash";
    else if (landed && !moving) clip.current = "land";
    else if (moving || runLinger.current > 0) clip.current = isLevitating ? "float" : "run";
    else clip.current = isCasting && castClip !== null && !castsStill ? "cast" : rest;

    rise.current = stepLevitation(rise.current, isLevitating, delta);
    const lift = levitationLift(rise.current);
    const hover = lift * LEVITATE_HEIGHT + Math.sin(now * 1.6) * LEVITATE_BOB * lift;

    if (heading.current !== null) yaw.current = turnTowards(yaw.current, heading.current, delta * TURN_RATE);
    if (body.current) {
      // Without a cast clip: a leap with a full spin (rising into a levitation is show enough).
      const hop =
        isCasting && castClip === null && !isLevitating && !handProp && !wand && !castsStill ? castProgress : 0;
      body.current.position.y = Math.sin(Math.PI * hop) * HOP_HEIGHT + hover - sunk * SINK_DEPTH;
      body.current.rotation.y = yaw.current + easeInOut(hop) * Math.PI * 2;
      // No shove clip: a lunge. No knocked clip: reeling back mid-flight (yaw first, then the tilt).
      const lunge =
        shoveSeconds.current === null && shoveElapsed < LUNGE_SECONDS
          ? Math.sin((Math.PI * shoveElapsed) / LUNGE_SECONDS) * LUNGE_DISTANCE
          : 0;
      body.current.position.x = Math.sin(yaw.current) * lunge;
      body.current.position.z = Math.cos(yaw.current) * lunge;
      const flight =
        reeling && knockedSeconds.current === null && current?.motion === "leap"
          ? Math.sin(Math.PI * current.progress)
          : 0;
      body.current.rotation.order = "YXZ";
      body.current.rotation.x = -flight * KNOCKED_TILT;
    }
    if (effects.current) effects.current.position.y = hover;
  });

  const token: TokenFx = {
    ...signals,
    player,
    character,
    color,
    charred: fallen && !character?.fallenModel,
    wandTip,
    live: { rise, levitating, seated, bladesOut, crackling, charged, propHeld, wandOut },
    hopBurst,
    shoveAt,
    landing,
    hasShoveClip: shoveSeconds.current !== null,
  };
  const model = character && (fallen && character.fallenModel ? character.fallenModel : character.model);

  return (
    <group ref={group}>
      <group ref={effects} scale={EFFECT_SCALE}>
        {nameTag && (
          <NameTag text={nameTag.text} color={color} active={isActive} y={TAG_HEIGHT + nameTag.seat * TAG_STAGGER} />
        )}
        {TOKEN_EFFECTS.aura.map((Effect, index) => (
          <Effect key={index} token={token} />
        ))}
      </group>
      {TOKEN_EFFECTS.ground.map((Effect, index) => (
        <Effect key={index} token={token} />
      ))}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.62, 0.75, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.9 : 0.35} toneMapped={false} />
      </mesh>

      <group ref={body}>
        {TOKEN_EFFECTS.body.map((Effect, index) => (
          <Effect key={index} token={token} />
        ))}
        {model ? (
          <Suspense fallback={<Placeholder color={color} />}>
            <CharacterModel
              url={model}
              height={FIGURE_HEIGHT}
              clip={clip}
              onClipLengths={onClipLengths}
              fallen={token.charred}
            >
              {(figure) =>
                TOKEN_EFFECTS.figure.map((Effect, index) => <Effect key={index} token={token} figure={figure} />)
              }
            </CharacterModel>
          </Suspense>
        ) : (
          <Placeholder color={color} />
        )}
        {canRest && <RestChair seated={seated} chair={fallen ? character?.fallenChair : character?.chair} />}
      </group>
    </group>
  );
}

function nextSegment(from: Vector3, waypoint: Waypoint | undefined): Segment | null {
  if (!waypoint) return null;

  const distance = from.distanceTo(waypoint.to);
  // A dash goes straight through, even round a track's bends.
  if (waypoint.seated && !waypoint.teleport && !waypoint.dash && distance < SLIDE_DISTANCE) {
    return {
      from: from.clone(),
      to: waypoint.to,
      path: waypoint.path,
      motion: "slide",
      progress: 0,
      duration: SLIDE_SECONDS,
    };
  }
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

/** Angle round the vertical facing along `direction` (models face +z); null if it's straight up or down. */
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
