import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import type { ClipLengths } from "../../characters";
import { KNOCKED_LANDING_SECONDS, LUNGE_DISTANCE, LUNGE_SECONDS } from "./trample";
import type { MotionFrame, Segment } from "./motion";
import {
  actTraits,
  CAST_HOLD_SECONDS,
  CHAIR_AT,
  createTokenActs,
  DASH_VANISH_SECONDS,
  EMERGE_SECONDS,
  HOP_SECONDS,
  RUN_LINGER_SECONDS,
  sequenceStep,
  SINK_SECONDS,
  stepPose,
  type PoseInput,
  type TokenActs,
} from "./pose";

const SETTLED: MotionFrame = { segment: null, travelling: false, settled: true };
const IDLE_SIGNALS: PoseInput["signals"] = {
  isDashing: false,
  isFuryAwake: false,
  isResting: false,
  shove: null,
  knocked: null,
  hop: null,
  dragged: null,
  abilityCast: null,
  verdict: null,
};

function input(now: number, overrides: Partial<PoseInput> = {}): PoseInput {
  return {
    now,
    delta: 1 / 60,
    signals: IDLE_SIGNALS,
    levitating: false,
    traits: actTraits(null),
    lengths: {},
    canRest: true,
    motion: SETTLED,
    heading: 0,
    path: [0, 0, 1],
    position: [0, 0, 0],
    faceToward: null,
    ...overrides,
  };
}

function signals(overrides: Partial<PoseInput["signals"]>): PoseInput["signals"] {
  return { ...IDLE_SIGNALS, ...overrides };
}

function run(arriving: boolean, progress = 0.5): MotionFrame {
  const segment: Segment = {
    from: new Vector3(),
    to: new Vector3(1, 0, 0),
    path: [1, 0, 0],
    progress,
    duration: 1,
    motion: "run",
    arriving,
  };
  return { segment, travelling: true, settled: false };
}

function leaping(progress: number): MotionFrame {
  const segment: Segment = {
    from: new Vector3(),
    to: new Vector3(5, 0, 0),
    path: [1, 0, 0],
    progress,
    duration: 1,
    motion: "leap",
  };
  return { segment, travelling: true, settled: false };
}

describe("the clip a figure plays", () => {
  it("idles at rest, floats while levitating", () => {
    const acts = createTokenActs();
    expect(stepPose(acts, input(0)).clip).toBe("idle");
    expect(stepPose(acts, input(0, { levitating: true })).clip).toBe("float");
  });

  it("runs while moving, lingers briefly after, but brakes onto the walk's last tile", () => {
    const acts = createTokenActs();
    expect(stepPose(acts, input(0, { motion: run(false) })).clip).toBe("run");
    expect(acts.runLinger).toBe(RUN_LINGER_SECONDS);
    expect(stepPose(acts, input(0.1, { delta: 0.1 })).clip).toBe("run");
    expect(stepPose(acts, input(0.2, { delta: 0.1 })).clip).toBe("idle");

    const braking = createTokenActs();
    expect(stepPose(braking, input(0, { motion: run(true), lengths: { brake: 1 } })).clip).toBe("brake");
    expect(stepPose(braking, input(0.01)).clip).toBe("idle");
    expect(stepPose(createTokenActs(), input(0, { motion: run(true) })).clip).toBe("run");
  });

  it("plays the cast clip, holds its last pose, then idles", () => {
    const acts = createTokenActs();
    const lengths: ClipLengths = { cast: 1 };
    const casting = signals({ abilityCast: 7 });
    const start = stepPose(acts, input(10, { signals: casting, lengths }));
    expect(start).toMatchObject({ clip: "cast", bladesOut: true, wandOut: true, spin: 0 });
    const held = stepPose(acts, input(11.2, { signals: casting, lengths }));
    expect(held).toMatchObject({ clip: "cast", bladesOut: false });
    expect(stepPose(acts, input(11 + CAST_HOLD_SECONDS, { signals: casting, lengths })).clip).toBe("idle");
  });

  it("stands still to cast when the character casts still", () => {
    const traits = actTraits({ castsStill: true });
    const pose = stepPose(
      createTokenActs(),
      input(0, { signals: signals({ abilityCast: 1 }), lengths: { cast: 1 }, traits }),
    );
    expect(pose).toMatchObject({ clip: "idle", wandOut: true });
  });

  it("leaps with a spin for an ability without a cast clip, unless holding a wand", () => {
    const acts = createTokenActs();
    stepPose(acts, input(0, { signals: signals({ abilityCast: 1 }) }));
    expect(stepPose(acts, input(HOP_SECONDS / 2, { signals: signals({ abilityCast: 1 }) })).spin).toBeCloseTo(0.5);

    const wand = actTraits({ wand: true });
    const pose = stepPose(createTokenActs(), input(0, { signals: signals({ abilityCast: 1 }), traits: wand }));
    expect(pose.spin).toBe(0);
  });

  it("acts out Themis's verdict, facing the one judged, then faces the path again", () => {
    const acts = createTokenActs();
    const lengths: ClipLengths = { guard: 1, cast: 1, scoff: 1 };
    const verdict = signals({ verdict: 3 });
    const at = (now: number) =>
      stepPose(acts, input(now, { signals: verdict, lengths, heading: 0, faceToward: [1, 0, 0] }));
    expect(at(0)).toMatchObject({ clip: "guard" });
    expect(at(0).heading).toBeCloseTo(Math.PI / 2);
    expect(at(1.5).clip).toBe("cast");
    expect(at(2.5).clip).toBe("scoff");
    expect(at(3.2).clip).toBe("scoff");
    const over = at(3 + CAST_HOLD_SECONDS);
    expect(over.clip).toBe("idle");
    expect(over.heading).toBe(0);
  });

  it("sits down, the chair coming in partway, then rests", () => {
    const acts = createTokenActs();
    const resting = signals({ isResting: true });
    const lengths: ClipLengths = { sit: 2, rest: 1 };
    expect(stepPose(acts, input(0, { signals: resting, lengths }))).toMatchObject({ clip: "sit", seated: false });
    expect(stepPose(acts, input(2 * CHAIR_AT, { signals: resting, lengths }))).toMatchObject({
      clip: "sit",
      seated: true,
    });
    expect(stepPose(acts, input(2, { signals: resting, lengths })).clip).toBe("rest");
  });

  it("sits at once without a sit clip, and never without a chair", () => {
    const resting = signals({ isResting: true });
    expect(stepPose(createTokenActs(), input(0, { signals: resting })).clip).toBe("rest");
    expect(stepPose(createTokenActs(), input(0, { signals: resting, canRest: false })).clip).toBe("idle");
  });
});

describe("a trample", () => {
  it("waits for the Berserker to settle, turns him against the path and lunges without a shove clip", () => {
    const acts = createTokenActs();
    const shove = signals({ shove: 4 });
    const moving = stepPose(acts, input(0, { signals: shove, motion: run(false) }));
    expect(moving.shoveAt).toBeNull();
    const started = stepPose(acts, input(1, { signals: shove }));
    expect(started.shoveAt).toBe(1);
    expect(Math.abs(started.heading ?? 0)).toBeCloseTo(Math.PI);
    expect(stepPose(acts, input(1 + LUNGE_SECONDS / 2, { signals: shove })).lunge).toBeCloseTo(LUNGE_DISTANCE);
    const over = stepPose(acts, input(5, { heading: Math.PI }));
    expect(over.heading).toBe(0);
  });

  it("plays the shove clip when the model has one", () => {
    const acts = createTokenActs();
    expect(stepPose(acts, input(0, { signals: signals({ shove: 1 }), lengths: { shove: 1 } }))).toMatchObject({
      clip: "shove",
      lunge: 0,
    });
  });

  it("knocks the one trampled, reeling back mid-leap without a knocked clip", () => {
    const knocked = signals({ knocked: 2 });
    const withClip = createTokenActs();
    expect(stepPose(withClip, input(0, { signals: knocked, lengths: { knocked: 1 } })).clip).toBe("knocked");
    expect(
      stepPose(withClip, input(Math.max(1, KNOCKED_LANDING_SECONDS) + CAST_HOLD_SECONDS, { lengths: { knocked: 1 } }))
        .clip,
    ).toBe("idle");

    const reel = stepPose(createTokenActs(), input(0, { signals: knocked, motion: leaping(0.5) })).reel;
    expect(reel).toBeCloseTo(1);
  });
});

describe("the lightning dash", () => {
  it("throws itself forward, vanishes into the bolt, then lands", () => {
    const acts = createTokenActs();
    const lengths: ClipLengths = { land: 1 };
    const dashing = signals({ isDashing: true });
    expect(stepPose(acts, input(0, { signals: dashing, lengths }))).toMatchObject({ clip: "dash", hidden: false });
    expect(stepPose(acts, input(DASH_VANISH_SECONDS, { signals: dashing, lengths })).hidden).toBe(true);
    const landed = stepPose(acts, input(3, { lengths }));
    expect(landed).toMatchObject({ clip: "land", hidden: false, landingAt: 3 });
    expect(stepPose(acts, input(3 + 1 + CAST_HOLD_SECONDS, { lengths })).clip).toBe("idle");
  });
});

describe("Hell's Drag", () => {
  it("sinks the figure, keeps it gone while carried off, then lets it climb out", () => {
    const acts: TokenActs = createTokenActs();
    const sinking = signals({ dragged: { id: 1, phase: "sink" } });
    expect(stepPose(acts, input(0, { signals: sinking })).sunk).toBe(0);
    expect(stepPose(acts, input(SINK_SECONDS / 2, { signals: sinking })).sunk).toBeCloseTo(0.25);
    stepPose(acts, input(SINK_SECONDS, { signals: sinking }));
    expect(stepPose(acts, input(SINK_SECONDS + 1, { signals: sinking }))).toMatchObject({ gone: true, sunk: 1 });
    const over = signals({ dragged: { id: 1, phase: "over" } });
    expect(stepPose(acts, input(10, { signals: over, motion: leaping(0.5) })).gone).toBe(true);
    stepPose(acts, input(11, { signals: over }));
    expect(stepPose(acts, input(11 + EMERGE_SECONDS / 2, { signals: over })).sunk).toBeCloseTo(0.5);
    expect(stepPose(acts, input(12, { signals: over })).sunk).toBe(0);
    expect(acts.drag).toBeNull();
  });
});

describe("a sequence of clips", () => {
  const lengths: ClipLengths = { guard: 1, scoff: 2 };

  it("plays each in turn, holds the last, then is over", () => {
    expect(sequenceStep(["guard", "scoff"], lengths, 0.5)).toEqual({ kind: "playing", clip: "guard" });
    expect(sequenceStep(["guard", "scoff"], lengths, 2)).toEqual({ kind: "playing", clip: "scoff" });
    expect(sequenceStep(["guard", "scoff"], lengths, 3.2, 0.5)).toEqual({ kind: "playing", clip: "scoff" });
    expect(sequenceStep(["guard", "scoff"], lengths, 3.5, 0.5)).toEqual({ kind: "over" });
  });

  it("only holds a moment when the model has none of them", () => {
    expect(sequenceStep([], lengths, 0.2, 0.5)).toEqual({ kind: "playing", clip: null });
    expect(sequenceStep([], lengths, 0.5, 0.5)).toEqual({ kind: "over" });
  });
});
