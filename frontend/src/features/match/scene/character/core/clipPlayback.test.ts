import { describe, expect, it } from "vitest";
import type { CharacterClip } from "../../../characters";
import {
  clipToPlay,
  CROSSFADE_SECONDS,
  crossfadeSeconds,
  RUN_TO_SIT_CROSSFADE_SECONDS,
  HANDOVER_SECONDS,
  SETTLE_CROSSFADE_SECONDS,
  shownSeconds,
  SIT_CROSSFADE_SECONDS,
} from "./clipPlayback";

describe("blending clips", () => {
  it("settles slowly onto and off the chair, quickly straight from a run or out of the sit", () => {
    expect(crossfadeSeconds("sit", "rest")).toBe(CROSSFADE_SECONDS);
    expect(crossfadeSeconds("run", "rest")).toBe(RUN_TO_SIT_CROSSFADE_SECONDS);
    expect(crossfadeSeconds("idle", "rest")).toBe(SIT_CROSSFADE_SECONDS);
    expect(crossfadeSeconds("rest", "run")).toBe(SIT_CROSSFADE_SECONDS);
  });

  it("lets an intro, cast or landing settle into the next loop", () => {
    for (const from of ["intro", "cast", "land", "guard"] as const)
      expect(crossfadeSeconds(from, "idle")).toBe(SETTLE_CROSSFADE_SECONDS);
    expect(crossfadeSeconds("idle", "run")).toBe(CROSSFADE_SECONDS);
  });
});

describe("handing over to the next clip", () => {
  it("hands a one-shot over before its end, while the body still moves", () => {
    expect(shownSeconds("intro", 4)).toBeCloseTo(4 - HANDOVER_SECONDS);
    expect(shownSeconds("guard", 1)).toBeCloseTo(0.85);
  });

  it("keeps loops whole", () => {
    expect(shownSeconds("idle", 7.8)).toBe(7.8);
  });
});

describe("the clip a model plays", () => {
  const has = (available: CharacterClip[]) => (clip: CharacterClip) => available.includes(clip);

  it("plays what's wanted when the model has it", () => {
    expect(clipToPlay("run", has(["idle", "run"]), "idle")).toBe("run");
  });

  it("idles for a missing showcase or float, and keeps the current clip for any other", () => {
    expect(clipToPlay("float", has(["idle", "run"]), "run")).toBe("idle");
    expect(clipToPlay("brake", has(["idle", "run"]), "run")).toBe("run");
    expect(clipToPlay("brake", has(["idle", "run"]), null)).toBe("idle");
  });
});
