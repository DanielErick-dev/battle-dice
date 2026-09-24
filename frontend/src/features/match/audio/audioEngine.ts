export type AudioBus = "sfx" | "music" | "ambience";

const BUS_VOLUME: Record<AudioBus, number> = { sfx: 1, music: 0.32, ambience: 0.55 };
const FADE_SECONDS = 0.4;

/**
 * One AudioContext for the whole game, split into buses so sound effects, music and
 * ambience can be muted independently. Created lazily; browsers only let it run after
 * a user gesture, so call `unlock` from an input handler.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private readonly buses = new Map<AudioBus, GainNode>();
  private noise: AudioBuffer | null = null;
  private muted = false;
  private musicEnabled = true;
  private readonly readyListeners = new Set<() => void>();

  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === "suspended") void context.resume();
  }

  /** The context, only once it is actually playing. */
  get running(): AudioContext | null {
    return this.context?.state === "running" ? this.context : null;
  }

  bus(name: AudioBus): GainNode | null {
    return this.buses.get(name) ?? null;
  }

  /** One second of white noise, shared by every noise-based sound. */
  get noiseBuffer(): AudioBuffer | null {
    return this.noise;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  /** Music and ambience together; sound effects follow only the global mute. */
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.applyVolumes();
  }

  /** Runs `listener` whenever the context starts running (and right away if it already is). */
  onRunning(listener: () => void): () => void {
    this.readyListeners.add(listener);
    if (this.running) listener();
    return () => this.readyListeners.delete(listener);
  }

  dispose(): void {
    this.readyListeners.clear();
    void this.context?.close();
    this.context = null;
    this.buses.clear();
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined" || !("AudioContext" in window)) return null;

    const context = new AudioContext();
    const compressor = context.createDynamicsCompressor();
    compressor.connect(context.destination);
    for (const name of Object.keys(BUS_VOLUME) as AudioBus[]) {
      const gain = context.createGain();
      gain.gain.value = this.targetVolume(name);
      gain.connect(compressor);
      this.buses.set(name, gain);
    }
    this.noise = createNoiseBuffer(context);
    context.addEventListener("statechange", () => {
      if (context.state === "running") this.readyListeners.forEach((listener) => listener());
    });

    this.context = context;
    return context;
  }

  private targetVolume(name: AudioBus): number {
    if (this.muted) return 0;
    if (name !== "sfx" && !this.musicEnabled) return 0;
    return BUS_VOLUME[name];
  }

  private applyVolumes(): void {
    const context = this.context;
    if (!context) return;
    for (const [name, gain] of this.buses) {
      gain.gain.setTargetAtTime(this.targetVolume(name), context.currentTime, FADE_SECONDS / 3);
    }
  }
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
