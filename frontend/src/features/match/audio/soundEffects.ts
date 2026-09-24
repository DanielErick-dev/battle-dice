/** Sounds the match can play. Kept as an interface so tests and a future asset-based player can swap in. */
export interface MatchSounds {
  diceShake: () => void;
  diceLand: () => void;
  step: () => void;
  leap: () => void;
  portal: () => void;
  trap: () => void;
  win: () => void;
}

type Wave = OscillatorType;

/**
 * Procedural sound effects on the Web Audio API: no audio files to load or license.
 * The AudioContext is created lazily and must be unlocked by a user gesture.
 */
export class SynthSounds implements MatchSounds {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  /** Call from a click/keydown handler; browsers block audio until then. */
  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === "suspended") void context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.02);
    }
  }

  diceShake = (): void =>
    this.play((at) => {
      for (let i = 0; i < 9; i++) {
        const offset = i * 0.075 + Math.random() * 0.03;
        this.noiseBurst(at + offset, 0.035, 2200 + Math.random() * 2200, 0.35);
      }
    });

  diceLand = (): void =>
    this.play((at) => {
      this.tone(at, 0.14, 160, 55, "sine", 0.7);
      this.noiseBurst(at, 0.05, 3000, 0.4);
    });

  step = (): void =>
    this.play((at) => {
      this.tone(at, 0.07, 190, 90, "triangle", 0.22);
      this.noiseBurst(at, 0.03, 1400, 0.12);
    });

  leap = (): void =>
    this.play((at) => {
      this.noiseSweep(at, 0.6, 350, 2400, 0.45);
    });

  portal = (): void =>
    this.play((at) => {
      this.tone(at, 0.55, 280, 1100, "sine", 0.28);
      this.tone(at, 0.55, 283, 1112, "sine", 0.2);
      [880, 1175, 1480, 1760].forEach((frequency, i) => {
        this.tone(at + 0.12 + i * 0.07, 0.18, frequency, frequency, "triangle", 0.12);
      });
    });

  trap = (): void =>
    this.play((at) => {
      this.tone(at, 0.45, 420, 70, "sawtooth", 0.22, 1400);
      this.tone(at + 0.02, 0.4, 300, 60, "square", 0.1, 900);
      this.noiseBurst(at, 0.12, 700, 0.3);
    });

  win = (): void =>
    this.play((at) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, i) => this.tone(at + i * 0.11, 0.22, frequency, frequency, "square", 0.12, 3000));
      const chordAt = at + notes.length * 0.11;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency) => {
        this.tone(chordAt, 0.9, frequency, frequency, "triangle", 0.14);
      });
    });

  private play(schedule: (at: number) => void): void {
    if (this.muted) return;
    const context = this.ensureContext();
    if (!context || context.state !== "running") return;
    schedule(context.currentTime + 0.005);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined" || !("AudioContext" in window)) return null;

    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const compressor = this.context.createDynamicsCompressor();
    this.master.connect(compressor).connect(this.context.destination);
    this.noise = createNoiseBuffer(this.context);
    return this.context;
  }

  /** Oscillator gliding from `from` to `to` Hz with a fast attack and exponential decay. */
  private tone(at: number, duration: number, from: number, to: number, wave: Wave, volume: number, lowpass?: number) {
    const { context, master } = this;
    if (!context || !master) return;

    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);

    const gain = envelope(context, at, duration, volume);
    let output: AudioNode = oscillator.connect(gain);
    if (lowpass) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = lowpass;
      output = output.connect(filter);
    }
    output.connect(master);

    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  private noiseBurst(at: number, duration: number, frequency: number, volume: number) {
    this.noiseSweep(at, duration, frequency, frequency, volume);
  }

  /** Band-passed white noise whose center frequency rises then falls (a whoosh when long). */
  private noiseSweep(at: number, duration: number, from: number, peak: number, volume: number) {
    const { context, master, noise } = this;
    if (!context || !master || !noise) return;

    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(peak, at + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(from, at + duration);

    source.connect(filter).connect(envelope(context, at, duration, volume)).connect(master);
    source.start(at);
    source.stop(at + duration + 0.05);
  }
}

function envelope(context: AudioContext, at: number, duration: number, volume: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.012, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  return gain;
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
