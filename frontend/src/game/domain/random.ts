/** Source of uniform random numbers in [0, 1), injected so games can be replayed and tested. */
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
