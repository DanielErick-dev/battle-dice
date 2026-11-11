import { seededRandom } from "@/game/domain/core/random";

/** Where a drifting cloud's particles start: inside a disc of `radius`, between floor and ceiling. */
export interface DriftCloud {
  /** x, y, z per particle. */
  positions: Float32Array;
  /** 0–1 per particle: its own pace, sway and size. */
  seeds: Float32Array;
}

export function driftCloud(seed: number, count: number, radius: number, floor: number, ceiling: number): DriftCloud {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    // Square root so the particles spread evenly over the disc instead of crowding its middle.
    const distance = Math.sqrt(random()) * radius;
    positions.set(
      [Math.cos(angle) * distance, floor + random() * (ceiling - floor), Math.sin(angle) * distance],
      i * 3,
    );
    seeds[i] = random();
  }
  return { positions, seeds };
}

export const SHAFT_COUNT = 7;

/** One beam of sunlight: where its cone hangs, its lean and its width at the ground. */
export interface Shaft {
  position: [number, number, number];
  tilt: [number, number, number];
  width: number;
}

/** The sunbeams spread round the arena, each leaning a little outwards. */
export function shaftLayout(radius: number): Shaft[] {
  const random = seededRandom(91);
  return Array.from({ length: SHAFT_COUNT }, (_, i) => {
    const angle = (i / SHAFT_COUNT) * Math.PI * 2 + random() * 0.5;
    const distance = radius * (0.35 + random() * 0.55);
    return {
      position: [Math.cos(angle) * distance, 14, Math.sin(angle) * distance],
      tilt: [0.18 * Math.sin(angle), 0, 0.18 * Math.cos(angle)],
      width: 1.8 + random() * 2.2,
    };
  });
}
