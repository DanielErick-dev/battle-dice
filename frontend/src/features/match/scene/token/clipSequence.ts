import type { CharacterClip, ClipLengths } from "@/features/characters";
import { CAST_HOLD_SECONDS } from "./poseTimings";

type SequenceStep = { kind: "playing"; clip: CharacterClip | null } | { kind: "over" };

/** Where `elapsed` falls in clips played back to back: one of them, the last one's held pose, or over. */
export function sequenceStep(
  clips: readonly CharacterClip[],
  lengths: ClipLengths,
  elapsed: number,
  hold = CAST_HOLD_SECONDS,
): SequenceStep {
  let left = elapsed;
  for (const name of clips) {
    const length = lengths[name] ?? 0;
    if (left < length) return { kind: "playing", clip: name };
    left -= length;
  }
  return left >= hold ? { kind: "over" } : { kind: "playing", clip: clips.at(-1) ?? null };
}
