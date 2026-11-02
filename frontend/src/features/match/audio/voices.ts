import type { AbilityId } from "@/game/domain/abilities/ability";

/** A line a character shouts: a recording in public/audio/voices/<character>/ (one picked at random), heard `delay` seconds after its cue. */
export interface VoiceLine {
  src: string | readonly string[];
  delay: number;
}

/** Shouts timed against each cast clip; until a recording exists, a synthesized stand-in or nothing plays (see SynthSounds). */
export const ABILITY_VOICES: Partial<Record<AbilityId, VoiceLine>> = {
  // A roar, then "Indomável!", over the chest beats of Bjorn's cast.
  untamed: { src: "/audio/voices/bjorn/bjorn-untamed.mp3", delay: 0 },
  // One of Themis's two cold lines, as the giant scale fades in (verdictTimeline's appear).
  silentVerdict: { src: [1, 2].map((take) => `/audio/voices/themis/themis-verdict-${take}.mp3`), delay: 0.3 },
};

export function voiceTake({ src }: VoiceLine, random = Math.random): string {
  return typeof src === "string" ? src : src[Math.floor(random() * src.length)];
}
