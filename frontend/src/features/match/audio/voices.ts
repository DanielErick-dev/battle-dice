import type { AbilityId } from "@/game/domain/abilities/ability";

/** A line a character shouts: a recording in public/audio/voices, heard `delay` seconds after its cue. */
export interface VoiceLine {
  src: string;
  delay: number;
}

/** Shouts timed against each cast clip; until a recording exists, a synthesized stand-in or nothing plays (see SynthSounds). */
export const ABILITY_VOICES: Partial<Record<AbilityId, VoiceLine>> = {
  // A roar, then "Indomável!", over the chest beats of Bjorn's cast.
  untamed: { src: "/audio/voices/untamed.mp3", delay: 0 },
};
