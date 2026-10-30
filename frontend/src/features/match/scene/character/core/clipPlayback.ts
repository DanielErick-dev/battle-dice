/** How each character clip plays and blends into the next (see CharacterModel). */
import type { CharacterClip } from "../../../characters";

interface ClipPlayback {
  /** Playback speed: the run cycle is sped up to match how fast tokens cover a tile. */
  speed: number;
  /** Played once, holding its last pose until the next clip takes over. */
  once: boolean;
}

export const CLIP_PLAYBACK: Readonly<Record<CharacterClip, ClipPlayback>> = {
  idle: { speed: 1, once: false },
  run: { speed: 1.25, once: false },
  cast: { speed: 1, once: true },
  intro: { speed: 1, once: true },
  showcase: { speed: 1, once: false },
  float: { speed: 1, once: false },
  dash: { speed: 1, once: true },
  land: { speed: 1, once: true },
  shove: { speed: 1, once: true },
  knocked: { speed: 1, once: true },
  rest: { speed: 1, once: false },
  hop: { speed: 1, once: true },
  brake: { speed: 1, once: true },
  sit: { speed: 1, once: true },
  guard: { speed: 1, once: true },
  scoff: { speed: 1, once: true },
};

export const CHARACTER_CLIPS = Object.keys(CLIP_PLAYBACK) as readonly CharacterClip[];

/** Seconds to blend from one clip into the next. */
export const CROSSFADE_SECONDS = 0.25;
/** Slower blend out of an intro, cast or landing, so its final pose settles into the next loop. */
export const SETTLE_CROSSFADE_SECONDS = 0.8;
/** Sitting down on the chair, and getting up off it: unhurried. */
export const SIT_CROSSFADE_SECONDS = 1.2;
/** Straight from a run onto the chair: quick, or the legs keep running through it as it appears. */
export const RUN_TO_SIT_CROSSFADE_SECONDS = 0.3;

/** How long `next` takes to blend in over `previous`. */
export function crossfadeSeconds(previous: CharacterClip | null, next: CharacterClip): number {
  if (next === "rest" && previous === "sit") return CROSSFADE_SECONDS;
  if (next === "rest" && previous === "run") return RUN_TO_SIT_CROSSFADE_SECONDS;
  if (next === "rest" || previous === "rest") return SIT_CROSSFADE_SECONDS;
  if (previous === "intro" || previous === "cast" || previous === "land") return SETTLE_CROSSFADE_SECONDS;
  return CROSSFADE_SECONDS;
}

/**
 * The clip to play for `wanted`: a missing showcase or float idles; any other missing clip keeps the
 * current one going (idle if nothing plays yet).
 */
export function clipToPlay(
  wanted: CharacterClip,
  has: (clip: CharacterClip) => boolean,
  playing: CharacterClip | null,
): CharacterClip {
  if (has(wanted)) return wanted;
  if (wanted === "showcase" || wanted === "float") return "idle";
  return playing ?? "idle";
}
