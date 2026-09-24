import type { AudioEngine } from "./audioEngine";
import { Synth } from "./synth";

const CRACKLE_TICK_MS = 70;
/** Chance per tick that the braziers pop. */
const CRACKLE_CHANCE = 0.35;

/**
 * Arena soundscape: surf rolling in (low-passed noise swelling on two slow LFOs) and the
 * braziers' fire (a low rumble plus random crackles).
 */
export class Ambience {
  private nodes: AudioScheduledSourceNode[] = [];
  private crackles: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly engine: AudioEngine) {}

  start(): void {
    const context = this.engine.running;
    const bus = this.engine.bus("ambience");
    const noise = this.engine.noiseBuffer;
    if (this.nodes.length > 0 || !context || !bus || !noise) return;

    this.startSurf(context, bus, noise);
    this.startFireRumble(context, bus, noise);
    this.crackles = setInterval(() => this.crackle(), CRACKLE_TICK_MS);
  }

  stop(): void {
    this.nodes.forEach((node) => node.stop());
    this.nodes = [];
    if (this.crackles !== null) clearInterval(this.crackles);
    this.crackles = null;
  }

  private startSurf(context: AudioContext, bus: AudioNode, noise: AudioBuffer) {
    const source = loopedNoise(context, noise);
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 650;
    const swell = context.createGain();
    swell.gain.value = 0.35;

    // Two slow, unrelated waves so the surf never repeats exactly.
    for (const [frequency, depth] of [
      [0.085, 0.22],
      [0.21, 0.1],
    ]) {
      const lfo = context.createOscillator();
      lfo.frequency.value = frequency;
      const amount = context.createGain();
      amount.gain.value = depth;
      lfo.connect(amount).connect(swell.gain);
      lfo.start();
      this.nodes.push(lfo);
    }

    source.connect(lowpass).connect(swell).connect(bus);
    source.start();
    this.nodes.push(source);
  }

  private startFireRumble(context: AudioContext, bus: AudioNode, noise: AudioBuffer) {
    const source = loopedNoise(context, noise);
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 160;
    const gain = context.createGain();
    gain.gain.value = 0.18;
    source.connect(lowpass).connect(gain).connect(bus);
    source.start(0, 0.37);
    this.nodes.push(source);
  }

  private crackle(): void {
    const context = this.engine.running;
    const bus = this.engine.bus("ambience");
    if (!context || !bus || Math.random() > CRACKLE_CHANCE) return;

    const synth = new Synth(context, bus, this.engine.noiseBuffer);
    const at = context.currentTime + Math.random() * 0.05;
    synth.noiseBurst(at, 0.015 + Math.random() * 0.025, 1800 + Math.random() * 4000, 0.05 + Math.random() * 0.12);
  }
}

function loopedNoise(context: AudioContext, noise: AudioBuffer): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  return source;
}
