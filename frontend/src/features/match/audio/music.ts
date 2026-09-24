import type { AudioEngine } from "./audioEngine";
import { Synth } from "./synth";

const BPM = 96;
const STEP_SECONDS = 60 / BPM / 4; // sixteenth notes
const STEPS_PER_BAR = 16;
/** How far ahead notes are scheduled, and how often the scheduler wakes up. */
const LOOKAHEAD_SECONDS = 0.15;
const TICK_MS = 40;

/** Am – F – C – G, one bar each: MIDI notes of each chord, root first. */
const PROGRESSION: readonly (readonly number[])[] = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
/** Arpeggio patterns as indexes into the chord (3+ = next octave), switched every 8 bars. */
const ARPEGGIOS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 2, 1, 0, 1],
  [0, 2, 3, 5, 3, 2, 4, 2],
];

/**
 * Background music composed on the fly: a heroic minor-key loop (pad, bass, echoing
 * arpeggio, drums, a taiko hit every four bars). No audio files, nothing to license.
 */
export class GenerativeMusic {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextStepAt = 0;
  private step = 0;
  private echo: GainNode | null = null;

  constructor(private readonly engine: AudioEngine) {}

  start(): void {
    const context = this.engine.running;
    const bus = this.engine.bus("music");
    if (this.timer !== null || !context || !bus) return;

    this.echo = createEcho(context, bus);
    this.nextStepAt = context.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.echo?.disconnect();
    this.echo = null;
  }

  private schedule(): void {
    const context = this.engine.running;
    const bus = this.engine.bus("music");
    if (!context || !bus || !this.echo) return;

    while (this.nextStepAt < context.currentTime + LOOKAHEAD_SECONDS) {
      this.playStep(new Synth(context, bus, this.engine.noiseBuffer), new Synth(context, this.echo, null));
      this.nextStepAt += STEP_SECONDS;
      this.step++;
    }
  }

  private playStep(dry: Synth, wet: Synth): void {
    const at = this.nextStepAt;
    const bar = Math.floor(this.step / STEPS_PER_BAR);
    const inBar = this.step % STEPS_PER_BAR;
    const chord = PROGRESSION[bar % PROGRESSION.length];
    const barSeconds = STEP_SECONDS * STEPS_PER_BAR;

    if (inBar === 0) {
      for (const note of chord) {
        const frequency = hz(note);
        dry.tone(at, barSeconds * 1.05, frequency, frequency, "sawtooth", 0.05, { lowpass: 900, attack: 0.5, detune: -8 });
        dry.tone(at, barSeconds * 1.05, frequency, frequency, "sawtooth", 0.05, { lowpass: 900, attack: 0.5, detune: 8 });
      }
      if (bar % 4 === 0) dry.tone(at, 0.6, 90, 38, "sine", 0.9);
    }

    const root = hz(chord[0] - 24);
    if (inBar === 0 || inBar === 8) dry.tone(at, STEP_SECONDS * 5, root, root, "triangle", 0.5, { lowpass: 500 });
    if (inBar === 6 || inBar === 14) dry.tone(at, STEP_SECONDS * 2, root * 2, root * 2, "triangle", 0.3, { lowpass: 700 });

    if (inBar % 2 === 0) {
      const pattern = ARPEGGIOS[Math.floor(bar / 8) % ARPEGGIOS.length];
      const index = pattern[(inBar / 2) % pattern.length];
      const note = chord[index % chord.length] + 12 * (1 + Math.floor(index / chord.length));
      wet.tone(at, STEP_SECONDS * 1.6, hz(note), hz(note), "triangle", 0.09);
    }

    if (inBar === 0 || inBar === 8) dry.tone(at, 0.18, 120, 45, "sine", 0.55);
    if (inBar % 4 === 2) dry.noiseBurst(at, 0.04, 8000, 0.05);
  }
}

/** Input that plays dry and through a feedback delay, for an echoing arpeggio. */
function createEcho(context: AudioContext, output: AudioNode): GainNode {
  const input = context.createGain();
  const delay = context.createDelay(1);
  delay.delayTime.value = STEP_SECONDS * 3;
  const feedback = context.createGain();
  feedback.gain.value = 0.35;

  input.connect(output);
  input.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(output);
  return input;
}

function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
