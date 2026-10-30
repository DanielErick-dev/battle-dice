import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_TIMINGS } from "../../config";
import { TILE_PITCH, type Vec3 } from "../boardLayout";
import {
  advanceMotion,
  ARRIVE_SECONDS,
  BASE_Y,
  createTokenMotion,
  followTarget,
  headingOf,
  LEAP_SECONDS,
  MAX_RUN_DISTANCE,
  nextSegment,
  SLIDE_DISTANCE,
  turnTowards,
  type Waypoint,
} from "./motion";

const ALONG_X: Vec3 = [1, 0, 0];

function waypoint(to: Vector3, overrides: Partial<Waypoint> = {}): Waypoint {
  return { to, travel: "walk", seated: false, arriving: false, path: ALONG_X, ...overrides };
}

describe("the segment to the next waypoint", () => {
  const origin = new Vector3();
  const nextTile = new Vector3(TILE_PITCH, 0, 0);

  it("runs one tile in one playback step", () => {
    const segment = nextSegment(origin, waypoint(nextTile));
    expect(segment?.motion).toBe("run");
    expect(segment?.duration).toBeCloseTo(DEFAULT_TIMINGS.stepMs / 1000);
  });

  it("eases the walk's last tile out over the arrival time", () => {
    const segment = nextSegment(origin, waypoint(nextTile, { arriving: true }));
    expect(segment).toMatchObject({ motion: "run", arriving: true, duration: ARRIVE_SECONDS });
  });

  it("leaps a teleport, and any move too long to run", () => {
    expect(nextSegment(origin, waypoint(nextTile, { travel: "teleport", arriving: true }))?.motion).toBe("leap");
    const far = new Vector3(MAX_RUN_DISTANCE + 0.1, 0, 0);
    const segment = nextSegment(origin, waypoint(far));
    expect(segment?.motion).toBe("leap");
    expect(segment?.duration).toBeGreaterThan(LEAP_SECONDS);
  });

  it("slides a seated figure over on its own tile, but never on a teleport or dash", () => {
    const aside = new Vector3(SLIDE_DISTANCE / 2, 0, 0);
    expect(nextSegment(origin, waypoint(aside, { seated: true }))?.motion).toBe("slide");
    expect(nextSegment(origin, waypoint(aside, { seated: true, travel: "teleport" }))?.motion).toBe("leap");
    expect(nextSegment(origin, waypoint(aside, { seated: true, travel: "dash" }))?.motion).toBe("dash");
  });

  it("is a dash when dashing, even far and teleporting", () => {
    const far = new Vector3(TILE_PITCH * 5, 0, 0);
    expect(nextSegment(origin, waypoint(far, { travel: "dash" }))?.motion).toBe("dash");
  });

  it("has none without a waypoint", () => {
    expect(nextSegment(origin, undefined)).toBeNull();
  });
});

describe("following the target", () => {
  it("places the figure on its first target, facing along the path, then queues new ones", () => {
    const motion = createTokenMotion();
    const position = new Vector3();
    const next = { travel: "walk", seated: false, arriving: false } as const;
    followTarget(motion, position, [2, 1, 3], [0, 0, 1], next);
    expect(position.toArray()).toEqual([2, 1 + BASE_Y, 3]);
    expect(motion.heading).toBe(0);
    expect(motion.waypoints).toHaveLength(0);

    followTarget(motion, position, [2, 1, 3], [0, 0, 1], next);
    expect(motion.waypoints).toHaveLength(0);
    followTarget(motion, position, [4, 1, 3], [1, 0, 0], next);
    expect(motion.waypoints).toHaveLength(1);
    expect(motion.waypoints[0].to.toArray()).toEqual([4, 1 + BASE_Y, 3]);
  });
});

describe("advancing along a segment", () => {
  function started(to: Vec3, path: Vec3, next: Partial<Waypoint> = {}) {
    const motion = createTokenMotion();
    const position = new Vector3();
    followTarget(motion, position, [0, 0, 0], [0, 0, 1], { travel: "walk", seated: false, arriving: false });
    followTarget(motion, position, to, path, { travel: "walk", seated: false, arriving: false, ...next });
    return { motion, position };
  }

  it("runs at a steady pace, facing where it goes, and ends facing along the path", () => {
    const { motion, position } = started([TILE_PITCH, 0, 0], [0, 0, 1]);
    const duration = DEFAULT_TIMINGS.stepMs / 1000;
    const frame = advanceMotion(motion, position, duration / 2);
    expect(frame).toMatchObject({ travelling: true, settled: false });
    expect(position.x).toBeCloseTo(TILE_PITCH / 2);
    expect(motion.heading).toBeCloseTo(Math.PI / 2);

    const last = advanceMotion(motion, position, duration);
    expect(last).toMatchObject({ travelling: false, settled: true });
    expect(last.segment?.progress).toBe(1);
    expect(position.x).toBeCloseTo(TILE_PITCH);
    expect(motion.heading).toBe(0);
  });

  it("slows onto the last tile of a walk", () => {
    const { motion, position } = started([TILE_PITCH, 0, 0], ALONG_X, { arriving: true });
    advanceMotion(motion, position, ARRIVE_SECONDS / 2);
    expect(position.x).toBeCloseTo(TILE_PITCH * 0.75);
  });

  it("arcs a leap over the straight line and lands facing along the path", () => {
    const { motion, position } = started([TILE_PITCH, 0, 0], [0, 0, -1], { travel: "teleport" });
    const segment = nextSegment(new Vector3(), waypoint(new Vector3(TILE_PITCH, 0, 0), { travel: "teleport" }));
    advanceMotion(motion, position, (segment?.duration ?? 0) / 2);
    expect(position.x).toBeCloseTo(TILE_PITCH / 2);
    expect(position.y).toBeCloseTo(BASE_Y + 1 + TILE_PITCH * 0.12);
    expect(motion.heading).toBeCloseTo(Math.PI);
  });

  it("keeps the heading through a seated slide", () => {
    const { motion, position } = started([SLIDE_DISTANCE / 2, 0, 0], ALONG_X, { seated: true });
    advanceMotion(motion, position, 1);
    expect(motion.heading).toBe(0);
  });
});

describe("headings", () => {
  it("faces +z at 0 and has none straight up", () => {
    expect(headingOf([0, 0, 1])).toBe(0);
    expect(headingOf([1, 0, 0])).toBeCloseTo(Math.PI / 2);
    expect(headingOf([0, 1, 0])).toBeNull();
  });

  it("turns the short way round", () => {
    expect(turnTowards(Math.PI * 0.9, -Math.PI * 0.9, 1)).toBeCloseTo(Math.PI * 1.1);
    expect(turnTowards(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});
