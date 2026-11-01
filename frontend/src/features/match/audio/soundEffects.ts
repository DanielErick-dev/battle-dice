import type { AbilityId } from "@/game/domain/abilities/ability";
import type { CardId } from "@/game/domain/cards/catalog";
import type { RealmKind } from "@/game/domain/types";
import type { AudioEngine } from "./audioEngine";
import { playSfx, type Synth } from "./synth";
import { ABILITY_VOICES } from "./voices";

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
  /** Energy aura igniting: a charging roar. */
  powerUp: () => void;
  /** A realm gate opening: a fire tunnel's roar, or a heavenly chord. */
  realmGate: (realm: RealmKind) => void;
  /** A card leaving the deck and turning face up. */
  cardFlip: () => void;
  /** A card sliding into the hand. */
  cardDraw: () => void;
  /** A card played: a whoosh, then the card's own signature sound. */
  cardCast: (cardId: CardId) => void;
  /** Arcane Shield absorbing a trap. */
  shieldBlock: () => void;
  /** A lightning strike: a sharp crack and a rolling rumble (Dormant Fury's dash), `delay` seconds from now. */
  thunder: (delay?: number) => void;
  /** An electric whine climbing over `seconds`: a push-off winding up before the dash. */
  electricRush: (seconds: number) => void;
  /** Arrow Rain: a twang and a whistle up, then a hail of arrows thudding down `landsIn` seconds later. */
  arrowVolley: (landsIn: number) => void;
  /** The character's shout as they use their ability, when they have one (see ABILITY_VOICES). */
  abilityVoice: (ability: AbilityId) => void;
  /** A body slammed out of the way: a heavy thud and the whoosh of them flying off (a trample). */
  shove: () => void;
  /** Hell's Drag: the ground tearing open under someone and the pull downwards. */
  hellGrasp: () => void;
  /** Seraphiel's Fall: heaven's chord torn down into a burning drone. */
  fall: () => void;
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

  thunder = (delay = 0): void =>
    this.play((synth, now) => {
      const at = now + delay;
      synth.noiseBurst(at, 0.08, 5200, 0.55);
      synth.noiseBurst(at + 0.03, 0.12, 2600, 0.4);
      synth.tone(at, 0.25, 1800, 120, "sawtooth", 0.1, { lowpass: 3000 });
      synth.noiseSweep(at + 0.05, 1.2, 900, 60, 0.45);
    });

  electricRush = (seconds: number): void =>
    this.play((synth, at) => {
      synth.tone(at, seconds, 140, 900, "sawtooth", 0.08, { lowpass: 2400 });
      synth.tone(at, seconds, 280, 1800, "square", 0.03, { lowpass: 3200 });
      synth.noiseSweep(at, seconds, 400, 4800, 0.18);
    });

  arrowVolley = (landsIn: number): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.18, 220, 150, "triangle", 0.3);
      synth.noiseBurst(at, 0.04, 3400, 0.3);
      synth.noiseSweep(at + 0.02, 0.55, 1200, 5200, 0.3);
      for (let i = 0; i < 9; i++) {
        const hit = at + landsIn - 0.3 + i * 0.045 + Math.random() * 0.03;
        synth.noiseSweep(hit - 0.12, 0.12, 5000, 1800, 0.08);
        synth.tone(hit, 0.06, 260 + Math.random() * 80, 90, "triangle", 0.22);
        synth.noiseBurst(hit, 0.03, 1800 + Math.random() * 900, 0.18);
      }
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

  realmGate = (realm: RealmKind): void =>
    this.play((synth, at) => {
      if (realm === "infernal") {
        synth.tone(at, 1.6, 38, 70, "sawtooth", 0.28, { lowpass: 380, attack: 0.5 });
        synth.tone(at + 0.1, 1.4, 55, 41, "square", 0.12, { lowpass: 260, attack: 0.3 });
        synth.noiseSweep(at, 1.4, 120, 900, 0.45, 0.6);
        synth.noiseSweep(at + 0.9, 0.9, 2400, 300, 0.35, 0.8);
        return;
      }
      [261.63, 329.63, 392, 523.25, 659.25].forEach((frequency, i) => {
        synth.tone(at + i * 0.09, 1.8, frequency, frequency, "sine", 0.09, { attack: 0.5 });
        synth.tone(at + i * 0.09, 1.8, frequency * 2, frequency * 2, "triangle", 0.03, { attack: 0.6, detune: 6 });
      });
      synth.noiseSweep(at + 0.3, 1.4, 3000, 9000, 0.12, 0.5);
    });

  cardFlip = (): void =>
    this.play((synth, at) => {
      synth.noiseBurst(at, 0.06, 3000, 0.2);
      synth.noiseSweep(at + 0.3, 0.3, 800, 4000, 0.15);
      synth.tone(at + 0.45, 0.6, 659.25, 987.77, "triangle", 0.08, { attack: 0.05 });
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

  abilityVoice = (ability: AbilityId): void => {
    const line = ABILITY_VOICES[ability];
    if (!line) return;
    // Until the recording is in, the Berserker roars all the same.
    void this.engine.playSample(line.src, "voice", line.delay).then((played) => {
      if (!played && ability === "untamed") this.roar(line.delay);
    });
  };

  hellGrasp = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 1.4, 45, 30, "sawtooth", 0.3, {
        lowpass: 320,
        attack: 0.3,
      });
      synth.noiseSweep(at, 0.9, 200, 1600, 0.4, 0.5);
      synth.noiseBurst(at + 0.7, 0.25, 500, 0.5);
      synth.tone(at + 1.5, 1.1, 160, 35, "sawtooth", 0.28, { lowpass: 700 });
      synth.noiseSweep(at + 1.5, 1.1, 2200, 150, 0.4, 0.8);
    });

  fall = (): void =>
    this.play((synth, at) => {
      [523.25, 659.25, 783.99].forEach((frequency) => synth.tone(at, 1.2, frequency, frequency / 4, "triangle", 0.1));
      synth.tone(at + 0.4, 2, 55, 36, "sawtooth", 0.3, {
        lowpass: 420,
        attack: 0.4,
      });
      synth.noiseSweep(at + 0.3, 1.8, 3000, 200, 0.35, 0.6);
    });

  shove = (): void =>
    this.play((synth, at) => {
      synth.tone(at, 0.28, 130, 42, "sine", 0.9);
      // The body of the blow up where small speakers carry it, and the crack of the hit.
      synth.tone(at, 0.2, 260, 90, "triangle", 0.45);
      synth.noiseBurst(at, 0.12, 1400, 0.7);
      synth.tone(at, 0.12, 320, 90, "square", 0.12, { lowpass: 1600 });
      synth.noiseSweep(at + 0.05, 0.7, 2400, 380, 0.3);
    });

  /** A beast's roar; the growl is doubled an octave up with a flutter so small speakers, which drop the lows, carry it. */
  private roar(delay: number): void {
    this.play((synth, now) => {
      const at = now + delay;
      synth.tone(at, 1.5, 120, 68, "sawtooth", 0.3, {
        lowpass: 900,
        attack: 0.12,
      });
      synth.tone(at, 1.5, 122, 70, "sawtooth", 0.22, {
        lowpass: 700,
        attack: 0.12,
        detune: 28,
      });
      synth.tone(at, 1.3, 60, 40, "square", 0.1, { lowpass: 300, attack: 0.1 });
      synth.tone(at, 1.4, 260, 150, "sawtooth", 0.22, {
        lowpass: 2200,
        attack: 0.1,
      });
      synth.tone(at, 1.4, 264, 152, "sawtooth", 0.16, {
        lowpass: 1800,
        attack: 0.1,
        detune: -35,
      });
      // The throat's flutter: short rasps in a quick run over the growl.
      for (let i = 0; i < 9; i++) synth.noiseBurst(at + 0.1 + i * 0.13, 0.09, 900 + (i % 3) * 250, 0.18);
      synth.noiseSweep(at, 1.5, 280, 1600, 0.45, 0.7);
    });
  }

  private play(schedule: (synth: Synth, at: number) => void): void {
    playSfx(this.engine, schedule);
  }
}

/** Each card's own sound, played after the cast whoosh. */
const CARD_SIGNATURES: Partial<Record<CardId, (synth: Synth, at: number) => void>> = {
  ancientScroll: (synth, at) => {
    synth.noiseSweep(at, 0.5, 600, 2400, 0.2, 0.8);
    synth.tone(at + 0.2, 0.6, 392, 523.25, "triangle", 0.1);
  },
  luckyCharm: (synth, at) => {
    [1046.5, 1318.5, 1568].forEach((frequency, i) => {
      synth.tone(at + i * 0.08, 0.35, frequency, frequency, "sine", 0.1);
    });
  },
  oracleEye: (synth, at) => {
    synth.tone(at, 1, 220, 220, "sine", 0.14, { attack: 0.3, detune: 7 });
    synth.tone(at, 1, 329.63, 329.63, "sine", 0.1, { attack: 0.3, detune: -7 });
    synth.tone(at + 0.4, 0.6, 880, 1760, "triangle", 0.06);
  },
  ancestralAwakening: (synth, at) => {
    synth.tone(at, 1, 55, 110, "sawtooth", 0.2, { lowpass: 600, attack: 0.4 });
    synth.noiseSweep(at + 0.3, 0.8, 300, 3500, 0.35, 0.7);
    [261.63, 329.63, 392, 523.25].forEach((frequency) => {
      synth.tone(at + 0.8, 1, frequency, frequency, "triangle", 0.08);
    });
  },
  arcaneBlast: (synth, at) => {
    synth.tone(at, 0.8, 90, 300, "sawtooth", 0.15, { lowpass: 900, attack: 0.6 });
    synth.noiseSweep(at + 0.7, 0.9, 200, 1800, 0.5, 0.6);
    synth.tone(at + 0.7, 0.9, 110, 55, "sine", 0.6);
  },
  blindingFlash: (synth, at) => {
    synth.tone(at, 0.5, 2400, 5200, "sine", 0.18);
    synth.noiseBurst(at, 0.35, 7000, 0.3);
  },
  arcaneShield: (synth, at) => {
    synth.tone(at, 0.8, 220, 440, "sine", 0.18, { attack: 0.2 });
    synth.tone(at, 0.8, 330, 660, "triangle", 0.08, { attack: 0.2, detune: 5 });
  },
  healingHerb: (synth, at) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, i) => {
      synth.tone(at + i * 0.06, 0.4, frequency, frequency, "sine", 0.1);
    });
  },
  berserkFury: (synth, at) => {
    synth.tone(at, 0.7, 60, 120, "sawtooth", 0.22, { lowpass: 500, attack: 0.2 });
    synth.noiseSweep(at, 0.7, 200, 2500, 0.3, 0.7);
  },
  mysticGate: (synth, at) => {
    synth.tone(at, 0.15, 1200, 2400, "sine", 0.2);
    synth.tone(at + 0.18, 0.15, 2400, 1200, "sine", 0.2);
  },
  fateRune: (synth, at) => {
    [392, 587.33, 783.99, 1174.66].forEach((frequency, i) => {
      synth.tone(at + i * 0.12, 0.8, frequency, frequency, "triangle", 0.12);
    });
  },
  windStep: (synth, at) => {
    synth.noiseSweep(at, 0.9, 300, 1400, 0.3, 0.5);
    synth.tone(at, 0.6, 523.25, 783.99, "sine", 0.1);
  },
};
