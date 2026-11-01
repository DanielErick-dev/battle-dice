import { Vector3 } from "three";
import { seededRandom } from "@/game/domain/random";

/** Ice spikes bursting out of the floor round the fist: how many, how far out, how tall. */
const SPIKES = 9;
const SPIKE_RING = [0.12, 0.34];
const SPIKE_HEIGHT = [0.1, 0.24];
/** Ice dust thrown up by the blow (shares of his height). */
export const DUST = 70;
/** Chunks of packed snow knocked flying by the blow: how many and how big. */
const CHUNKS = 16;
const CHUNK_SIZE = [0.018, 0.04];

export interface Spike {
  angle: number;
  ring: number;
  height: number;
  lean: number;
  delay: number;
}

/** Where each spike bursts out round the blow, the same every time. */
export function spikeLayout(): Spike[] {
  const random = seededRandom(17);
  return Array.from({ length: SPIKES }, (_, index) => {
    const angle = (index / SPIKES) * Math.PI * 2 + random() * 0.5;
    const ring = SPIKE_RING[0] + random() * (SPIKE_RING[1] - SPIKE_RING[0]);
    return {
      angle,
      ring,
      height: SPIKE_HEIGHT[0] + random() * (SPIKE_HEIGHT[1] - SPIKE_HEIGHT[0]),
      // Leaning out, away from the blow; the ones nearest it come up first.
      lean: 0.35 + random() * 0.35,
      delay: ((ring - SPIKE_RING[0]) / (SPIKE_RING[1] - SPIKE_RING[0])) * 0.12,
    };
  });
}

/** How fast each mote of ice dust leaves the blow. */
export function dustVelocities(): Vector3[] {
  const random = seededRandom(29);
  return Array.from({ length: DUST }, () => {
    const angle = random() * Math.PI * 2;
    const out = 0.25 + random() * 0.55;
    return new Vector3(Math.cos(angle) * out, 0.5 + random() * 0.9, Math.sin(angle) * out);
  });
}

export interface Chunk {
  velocity: Vector3;
  size: number;
  spin: Vector3;
}

/** How each chunk of snow is knocked flying: its speed, size and tumble. */
export function chunkLayout(): Chunk[] {
  const random = seededRandom(41);
  return Array.from({ length: CHUNKS }, () => {
    const angle = random() * Math.PI * 2;
    const out = 0.35 + random() * 0.6;
    return {
      velocity: new Vector3(Math.cos(angle) * out, 0.9 + random() * 0.8, Math.sin(angle) * out),
      size: CHUNK_SIZE[0] + random() * (CHUNK_SIZE[1] - CHUNK_SIZE[0]),
      spin: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(18),
    };
  });
}

/** Height after `t` seconds of something thrown up at `speed` under `gravity`, resting on the floor once down. */
export function arcHeight(speed: number, t: number, gravity: number): number {
  return Math.max(0, speed * t - (gravity / 2) * t * t);
}
