import type { AbilityId } from "@/game/domain/abilities";

/** A line a character shouts: a recording in public/audio/voices, heard `delay` seconds after its cue. */
export interface VoiceLine {
  src: string;
  delay: number;
}

/**
 * What characters shout as they use their ability (timed against their cast clip). Recordings are
 * optional: until one is in place, a synthesized stand-in plays, or nothing (see SynthSounds).
 */
export const ABILITY_VOICES: Partial<Record<AbilityId, VoiceLine>> = {
  // A roar, then "Indomável!", over the chest beats of Bjorn's cast.
  untamed: { src: "/audio/voices/untamed.mp3", delay: 0 },
};
