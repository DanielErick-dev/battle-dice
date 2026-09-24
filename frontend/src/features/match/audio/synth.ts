export interface ToneOptions {
  /** Low-pass cutoff in Hz, to soften bright waveforms. */
  lowpass?: number;
  /** Seconds to reach full volume (default: a click-free 12 ms). */
  attack?: number;
  /** Detune in cents, for chorus-like layering. */
  detune?: number;
}

/**
 * Small voices scheduled on a Web Audio graph: oscillator tones and filtered noise, each
 * with its own envelope, auto-stopped when done. Shared by effects, music and ambience.
 */
export class Synth {
  constructor(
    private readonly context: AudioContext,
    private readonly output: AudioNode,
    private readonly noise: AudioBuffer | null,
  ) {}

  /** Oscillator gliding from `from` to `to` Hz with an attack and exponential decay. */
  tone(at: number, duration: number, from: number, to: number, wave: OscillatorType, volume: number, options: ToneOptions = {}) {
    const { context } = this;
    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.detune.value = options.detune ?? 0;
    oscillator.frequency.setValueAtTime(from, at);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);

    let output: AudioNode = oscillator.connect(envelope(context, at, duration, volume, options.attack));
    if (options.lowpass) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = options.lowpass;
      output = output.connect(filter);
    }
    output.connect(this.output);

    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  noiseBurst(at: number, duration: number, frequency: number, volume: number) {
    this.noiseSweep(at, duration, frequency, frequency, volume);
  }

  /** Band-passed white noise whose centre frequency rises then falls (a whoosh when long). */
  noiseSweep(at: number, duration: number, from: number, peak: number, volume: number, q = 1.2) {
    const { context, noise } = this;
    if (!noise) return;

    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = duration > noise.duration;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(peak, at + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(from, at + duration);

    source.connect(filter).connect(envelope(context, at, duration, volume)).connect(this.output);
    source.start(at, Math.random() * noise.duration * 0.5);
    source.stop(at + duration + 0.05);
  }
}

function envelope(context: AudioContext, at: number, duration: number, volume: number, attack = 0.012): GainNode {
  const gain = context.createGain();
  const peakAt = at + Math.min(attack, duration / 2);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), peakAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  return gain;
}
