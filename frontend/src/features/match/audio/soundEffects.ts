import type { CardId } from "@/game/domain/cards";
import type { AudioEngine } from "./audioEngine";
import { Synth } from "./synth";

/** Sounds the match can play. Kept as an interface so tests and a future asset-based player can swap in. */
export interface MatchSounds {
  diceShake: () => void;
  /** The 3D die hitting the arena; `strength` 1 for the first impact, smaller for later bounces. */
  diceLand: (strength?: number) => void;
  step: () => void;
  leap: () => void;
  portal: () => void;
  trap: () => void;
  /** Advance tile: a rising boost. */
  boost: () => void;
  /** Extra turn: a bright chime. */
  bonus: () => void;
  /** Lost turn: a deflating two-note drop. */
  penalty: () => void;
  /** Ki aura igniting: a charging roar. */
  powerUp: () => void;
  /** A card sliding into the hand. */
  cardDraw: () => void;
  /** A card played: a whoosh, then the card's own signature sound. */
  cardCast: (cardId: CardId) => void;
  /** Ki Barrier absorbing a trap. */
  shieldBlock: () => void;
  win: () => void;
}

/** Procedural sound effects on the Web Audio API: no audio files to load or license. */
export class SynthSounds implements MatchSounds {
  constructor(private readonly engine: AudioEngine) {}

  diceShake = (): void =>
    this.play((synth, at) => {
      for (let i = 0; i < 6; i++) {
        const offset = i * 0.06 + Math.random() * 0.02;
        synth.noiseBurst(at + offset, 0.03, 2200 + Math.random() * 2200, 0.25);
      }
    });

  diceLand = (strength = 1): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.12, 170, 60, "sine", 0.7 * strength);
      synth.noiseBurst(at, 0.04, 2600 + Math.random() * 1200, 0.45 * strength);
    });

  step = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.07, 190, 90, "triangle", 0.22);
      synth.noiseBurst(at, 0.03, 1400, 0.12);
    });

  leap = (): void =>
    this.play((synth, at) => {
      synth.noiseSweep(at, 0.6, 350, 2400, 0.45);
    });

  portal = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.55, 280, 1100, "sine", 0.28);
      synth.tone(at, 0.55, 283, 1112, "sine", 0.2);
      [880, 1175, 1480, 1760].forEach((frequency, i) => {
        synth.tone(at + 0.12 + i * 0.07, 0.18, frequency, frequency, "triangle", 0.12);
      });
    });

  trap = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.45, 420, 70, "sawtooth", 0.22, { lowpass: 1400 });
      synth.tone(at + 0.02, 0.4, 300, 60, "square", 0.1, { lowpass: 900 });
      synth.noiseBurst(at, 0.12, 700, 0.3);
    });

  boost = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.35, 220, 880, "sawtooth", 0.12, { lowpass: 2200 });
      synth.tone(at, 0.35, 330, 1320, "triangle", 0.12);
      synth.noiseSweep(at, 0.4, 600, 3200, 0.2);
    });

  bonus = (): void =>
    this.play((synth, at) => {
      [783.99, 1046.5, 1318.5].forEach((frequency, i) => {
        synth.tone(at + i * 0.08, 0.35, frequency, frequency, "triangle", 0.16);
      });
    });

  penalty = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.22, 392, 370, "square", 0.1, { lowpass: 1200 });
      synth.tone(at + 0.24, 0.45, 311, 233, "square", 0.1, { lowpass: 1000 });
    });

  powerUp = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.9, 70, 140, "sawtooth", 0.2, { lowpass: 600, attack: 0.25 });
      synth.tone(at, 0.9, 140, 560, "sawtooth", 0.08, { lowpass: 1800, attack: 0.3, detune: 12 });
      synth.noiseSweep(at, 0.9, 300, 4200, 0.35, 0.7);
      synth.tone(at + 0.75, 0.5, 1175, 1175, "triangle", 0.1);
    });

  cardDraw = (): void =>
    this.play((synth, at) => {
      synth.noiseSweep(at, 0.25, 1500, 5000, 0.12);
      [1318.5, 1760, 2093].forEach((frequency, i) => {
        synth.tone(at + 0.05 + i * 0.05, 0.3, frequency, frequency, "sine", 0.08);
      });
    });

  cardCast = (cardId: CardId): void =>
    this.play((synth, at) => {
      synth.noiseSweep(at, 0.45, 400, 3000, 0.25);
      [440, 554.37, 659.25].forEach((frequency) => {
        synth.tone(at + 0.1, 0.5, frequency, frequency, "triangle", 0.08);
      });
      CARD_SIGNATURES[cardId]?.(synth, at + 0.4);
    });

  shieldBlock = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.6, 880, 660, "sine", 0.22);
      synth.tone(at, 0.6, 1320, 990, "sine", 0.1, { detune: 7 });
      synth.noiseBurst(at, 0.08, 5000, 0.2);
    });

  win = (): void =>
    this.play((synth, at) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, i) => {
        synth.tone(at + i * 0.11, 0.22, frequency, frequency, "square", 0.12, { lowpass: 3000 });
      });
      const chordAt = at + notes.length * 0.11;
      notes.forEach((frequency) => synth.tone(chordAt, 0.9, frequency, frequency, "triangle", 0.14));
    });

  private play(schedule: (synth: Synth, at: number) => void): void {
    const context = this.engine.running;
    const output = this.engine.bus("sfx");
    if (!context || !output) return;
    schedule(new Synth(context, output, this.engine.noiseBuffer), context.currentTime + 0.005);
  }
}

/** Each card's own sound, played after the cast whoosh. */
const CARD_SIGNATURES: Partial<Record<CardId, (synth: Synth, at: number) => void>> = {
  kamehameha: (synth, at) => {
    synth.tone(at, 0.8, 90, 300, "sawtooth", 0.15, { lowpass: 900, attack: 0.6 });
    synth.noiseSweep(at + 0.7, 0.9, 200, 1800, 0.5, 0.6);
    synth.tone(at + 0.7, 0.9, 110, 55, "sine", 0.6);
  },
  solarFlare: (synth, at) => {
    synth.tone(at, 0.5, 2400, 5200, "sine", 0.18);
    synth.noiseBurst(at, 0.35, 7000, 0.3);
  },
  kiBarrier: (synth, at) => {
    synth.tone(at, 0.8, 220, 440, "sine", 0.18, { attack: 0.2 });
    synth.tone(at, 0.8, 330, 660, "triangle", 0.08, { attack: 0.2, detune: 5 });
  },
  senzuBean: (synth, at) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, i) => {
      synth.tone(at + i * 0.06, 0.4, frequency, frequency, "sine", 0.1);
    });
  },
  kaioken: (synth, at) => {
    synth.tone(at, 0.7, 60, 120, "sawtooth", 0.22, { lowpass: 500, attack: 0.2 });
    synth.noiseSweep(at, 0.7, 200, 2500, 0.3, 0.7);
  },
  instantTransmission: (synth, at) => {
    synth.tone(at, 0.15, 1200, 2400, "sine", 0.2);
    synth.tone(at + 0.18, 0.15, 2400, 1200, "sine", 0.2);
  },
  dragonBall: (synth, at) => {
    [392, 587.33, 783.99, 1174.66].forEach((frequency, i) => {
      synth.tone(at + i * 0.12, 0.8, frequency, frequency, "triangle", 0.12);
    });
  },
  flyingNimbus: (synth, at) => {
    synth.noiseSweep(at, 0.9, 300, 1400, 0.3, 0.5);
    synth.tone(at, 0.6, 523.25, 783.99, "sine", 0.1);
  },
};
