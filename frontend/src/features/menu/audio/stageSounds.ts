import type { AudioEngine } from "@/features/match/audio/audioEngine";
import { playSfx, type Synth } from "@/features/match/audio/synth";

/** Sounds of the characters' intros on the menu stage, synthesized like the match's. */
export class StageSounds {
  constructor(private readonly engine: AudioEngine) {}

  /** A recorded line from public/audio/voices/<character>/. */
  voice = (src: string): void => void this.engine.playSample(src, "voice");

  /** A fist breaking the ground: a heavy thud, a run of cracks, rubble settling under a rumble. */
  groundBreak = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.5, 110, 36, "sine", 0.9);
      synth.tone(at, 0.25, 240, 80, "triangle", 0.45);
      synth.noiseBurst(at, 0.12, 900, 0.8);
      for (let i = 0; i < 7; i++) {
        synth.noiseBurst(at + 0.03 + i * 0.045 + (i % 2) * 0.015, 0.04, 1500 + (i % 3) * 500, 0.45 - i * 0.05);
      }
      for (let i = 0; i < 6; i++) synth.noiseBurst(at + 0.3 + i * 0.07, 0.06, 400 + (i % 3) * 150, 0.2 - i * 0.025);
      synth.noiseSweep(at, 0.9, 120, 320, 0.35, 0.8);
    });

  /** A soft major chord swelling in under a long airy whoosh. */
  heavenDescent = (): void =>
    this.play((synth, at) => {
      [262, 330, 392, 523].forEach((frequency, index) => {
        synth.tone(at + index * 0.12, 2.6, frequency, frequency, "sine", 0.12, {
          attack: 0.9,
          detune: index * 4,
        });
        synth.tone(at + index * 0.12, 2.6, frequency, frequency, "triangle", 0.05, { attack: 1.1, detune: -6 });
      });
      synth.noiseSweep(at, 2.6, 2400, 900, 0.18, 0.7);
    });

  /** A soft thud under a bright bell chime. */
  heavenLanding = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.35, 140, 60, "sine", 0.5);
      synth.noiseBurst(at, 0.15, 500, 0.3);
      [1047, 1319, 1568, 2093].forEach((frequency, index) => {
        synth.tone(at + index * 0.06, 1.6, frequency, frequency, "sine", 0.14 - index * 0.02);
      });
      synth.noiseSweep(at, 0.8, 3000, 6000, 0.08, 0.9);
    });

  /** A deep whump of air under a rushing gust, as loud as it is strong (0 to 1). */
  wingBeat = (strength = 1): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.4, 90, 45, "sine", 0.55 * strength);
      synth.noiseBurst(at, 0.25, 260, 0.45 * strength);
      synth.noiseSweep(at, 1.1, 500, 1800, 0.35 * strength, 0.6);
    });

  private play(schedule: (synth: Synth, at: number) => void): void {
    playSfx(this.engine, schedule);
  }
}
