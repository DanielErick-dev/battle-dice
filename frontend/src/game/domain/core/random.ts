import { at } from "./invariant";
/** Uniform in [0, 1); passed in so the rules never reach for a global generator. */
export type RandomSource = () => number;

const MULBERRY_STEP = 0x6d2b79f5;

/** Small deterministic PRNG (mulberry32): same seed, same sequence, so procedural details stay put. */
export function seededRandom(seed: number): RandomSource {
  return randomStream({ seed, counter: 0 }).random;
}

/** The match's draws as plain data: `counter` numbers already drawn from `seed`. */
export interface RngState {
  readonly seed: number;
  readonly counter: number;
}

export interface RandomStream {
  random: RandomSource;
  /** Where the stream stands now, to store back in the state. */
  snapshot(): RngState;
}

/** Resumes the mulberry32 sequence of `seed` right after its first `counter` draws. */
export function randomStream({ seed, counter }: RngState): RandomStream {
  // mulberry32's state only ever adds MULBERRY_STEP, so any position is one multiplication away.
  let state = (seed + Math.imul(counter, MULBERRY_STEP)) >>> 0;
  let drawn = counter;
  return {
    random: () => {
      drawn += 1;
      state = (state + MULBERRY_STEP) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    snapshot: () => ({ seed, counter: drawn }),
  };
}

/** One of `items` at random, when the rules guarantee there is one. */
export function randomItem<T>(items: readonly T[], random: RandomSource): T {
  return at(items, Math.floor(random() * items.length));
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [at(shuffled, j), at(shuffled, i)];
  }
  return shuffled;
}
