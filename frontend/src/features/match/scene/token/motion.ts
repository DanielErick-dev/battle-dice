/** Where a figure is on its way between tiles: its queue of waypoints, the segment it's on and its heading. */
import { MathUtils, Vector3 } from "three";
import { DEFAULT_TIMINGS } from "../../config";
import { TILE_HEIGHT, TILE_PITCH, TILE_SIZE, type Vec3 } from "../boardLayout";

/** How the view sends the figure to its next tile; a dash wins over a teleport. */
export type Travel = "walk" | "teleport" | "dash";

export interface Waypoint {
  to: Vector3;
  travel: Travel;
  /** Seated when sent there: a shift on its own tile slides the chair over instead of a run. */
  seated: boolean;
  /** The walk ends there: the run slows to a stop on the way. */
  arriving: boolean;
  /** Path direction at `to`. */
  path: Vec3;
}

interface SegmentBase {
  from: Vector3;
  to: Vector3;
  path: Vec3;
  progress: number;
  duration: number;
}

/** A slide makes room on its own tile, without getting up or turning (seated on its chair). */
export type Segment =
  (SegmentBase & { motion: "run"; arriving: boolean }) | (SegmentBase & { motion: "leap" | "dash" | "slide" });

export type Motion = Segment["motion"];

export interface TokenMotion {
  /** The last target followed, as a key; null until the figure is first placed. */
  lastTarget: string | null;
  waypoints: Waypoint[];
  segment: Segment | null;
  /** Angle round the vertical the figure turns to (0 = +z). */
  heading: number | null;
}

/** What the motion did this frame, for the pose that goes with it. */
export interface MotionFrame {
  /** The segment it was on this frame, also when it just ended. */
  segment: Segment | null;
  /** Still on a segment after this frame. */
  travelling: boolean;
  /** No segment and no waypoints left: standing on its tile. */
  settled: boolean;
}

/** A seated figure making room on its own tile: as far as that can be, and how long it takes. */
export const SLIDE_DISTANCE = TILE_SIZE * 0.8;
const SLIDE_SECONDS = 0.4;
/** One tile per playback step, so steps chain seamlessly. */
const RUN_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.stepMs / 1000);
/** The last tile of a walk, eased out from about the run's speed to a stop. */
export const ARRIVE_SECONDS = DEFAULT_TIMINGS.arriveMs / 1000;
const DASH_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.dashStepMs / 1000);
export const LEAP_SECONDS = 0.55;
const LEAP_SECONDS_PER_UNIT = 0.03;
/** Longer moves are never run, even without a teleport (e.g. restart). */
export const MAX_RUN_DISTANCE = TILE_PITCH * 1.5;
/** On top of its tile, wherever the tile sits (realm tracks float or sink). */
export const BASE_Y = TILE_HEIGHT / 2;

export function createTokenMotion(): TokenMotion {
  return { lastTarget: null, waypoints: [], segment: null, heading: null };
}

/** Places the figure on its first target, then queues each new target as a waypoint. */
export function followTarget(
  motion: TokenMotion,
  position: Vector3,
  target: Vec3,
  path: Vec3,
  next: Pick<Waypoint, "travel" | "seated" | "arriving">,
): void {
  const key = target.join(",");
  if (motion.lastTarget === null) {
    position.set(target[0], target[1] + BASE_Y, target[2]);
    motion.heading = headingOf(path) ?? 0;
  } else if (motion.lastTarget !== key) {
    motion.waypoints.push({ to: new Vector3(target[0], target[1] + BASE_Y, target[2]), path: [...path], ...next });
  }
  motion.lastTarget = key;
}

/** Moves the figure `delta` seconds along its segment, taking the next waypoint when it has none. */
export function advanceMotion(motion: TokenMotion, position: Vector3, delta: number): MotionFrame {
  motion.segment ??= nextSegment(position, motion.waypoints.shift());
  const current = motion.segment;
  if (current) {
    if (current.progress === 0 && current.motion !== "slide") {
      // A leap lands facing along the path, not back towards where it came from.
      const direction: Vec3 =
        current.motion === "leap" ? current.path : [current.to.x - current.from.x, 0, current.to.z - current.from.z];
      motion.heading = headingOf(direction) ?? motion.heading;
    }
    current.progress = Math.min(1, current.progress + delta / current.duration);
    placeAlong(current, position);
    if (current.progress >= 1) {
      motion.segment = null;
      // Come to rest facing along the path (after being pushed back, too).
      if (motion.waypoints.length === 0 && current.motion !== "slide") {
        motion.heading = headingOf(current.path) ?? motion.heading;
      }
    }
  }
  return {
    segment: current,
    travelling: motion.segment !== null,
    settled: motion.segment === null && motion.waypoints.length === 0,
  };
}

/** The segment from `from` to the waypoint: a slide, a run (eased to a stop when arriving), a leap or a dash. */
export function nextSegment(from: Vector3, waypoint: Waypoint | undefined): Segment | null {
  if (!waypoint) return null;

  const distance = from.distanceTo(waypoint.to);
  const base = { from: from.clone(), to: waypoint.to, path: waypoint.path, progress: 0 };
  // A dash goes straight through, even round a track's bends.
  if (waypoint.seated && waypoint.travel === "walk" && distance < SLIDE_DISTANCE) {
    return { ...base, motion: "slide", duration: SLIDE_SECONDS };
  }
  switch (waypoint.travel) {
    case "dash":
      return { ...base, motion: "dash", duration: Math.max(distance / DASH_SPEED, 0.01) };
    case "teleport":
      return leap(base, distance);
    case "walk":
      if (distance > MAX_RUN_DISTANCE) return leap(base, distance);
      return {
        ...base,
        motion: "run",
        duration: waypoint.arriving ? ARRIVE_SECONDS : Math.max(distance / RUN_SPEED, 0.01),
        arriving: waypoint.arriving,
      };
  }
}

function leap(base: Omit<SegmentBase, "duration">, distance: number): Segment {
  return { ...base, motion: "leap", duration: LEAP_SECONDS + distance * LEAP_SECONDS_PER_UNIT };
}

function placeAlong(segment: Segment, position: Vector3): void {
  switch (segment.motion) {
    case "leap": {
      const height = 1 + segment.from.distanceTo(segment.to) * 0.12;
      position.lerpVectors(segment.from, segment.to, easeInOut(segment.progress));
      // Arcs over the straight line between the two tiles' tops, whatever their heights.
      position.y += Math.sin(Math.PI * segment.progress) * height;
      return;
    }
    case "run": {
      const eased = segment.arriving ? 1 - (1 - segment.progress) ** 2 : segment.progress;
      position.lerpVectors(segment.from, segment.to, eased);
      return;
    }
    case "dash":
    case "slide":
      position.lerpVectors(segment.from, segment.to, segment.progress);
      return;
  }
}

/** Angle round the vertical facing along `direction` (models face +z); null if it's straight up or down. */
export function headingOf([x, , z]: Vec3): number | null {
  if (Math.hypot(x, z) < 1e-4) return null;
  return Math.atan2(x, z);
}

/** Eases an angle towards a target the short way round. */
export function turnTowards(angle: number, target: number, amount: number): number {
  const difference = MathUtils.euclideanModulo(target - angle + Math.PI, Math.PI * 2) - Math.PI;
  return angle + difference * Math.min(1, amount);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
