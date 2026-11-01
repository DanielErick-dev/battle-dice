/** Uniform in [0, 1); injected so games can be replayed and tested. */
export type RandomSource = () => number;

/** Small deterministic PRNG (mulberry32): same seed, same sequence, so procedural details stay put. */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of `items` at random (undefined when empty), drawing a single number either way. */
export function pickRandom<T>(items: readonly T[], random: RandomSource): T | undefined {
  return items[Math.floor(random() * items.length)];
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
