/** Repeatable pseudo-random numbers for procedural looks: the same input always gives the same value. */

const SIN_STRETCH = 43758.5453;

export function fract(x: number): number {
  return x - Math.floor(x);
}

/** The classic shader hash: a value in [0, 1) for `x`. */
export function noise(x: number): number {
  return fract(Math.sin(x * 12.9898) * SIN_STRETCH);
}

/** A value in [0, 1) for particle `index` and trait `salt`, so particles vary yet render the same every time. */
export function jitter(index: number, salt: number): number {
  return fract(Math.sin(index * 12.9898 + salt * 78.233) * SIN_STRETCH);
}

/** A steady scatter in [0, 1) for `n` (fractional steps of `n` give unrelated values). */
export function scatter(n: number): number {
  return fract(Math.sin(n * 91.7) * SIN_STRETCH);
}

/** Park–Miller generator: the older canvas textures were drawn with it, so they keep their exact look. */
export function parkMiller(seed: number): () => number {
  let state = seed;
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
}
