/** Where the water's edge runs across the sand, as a depth `z` for a given `x` (negative is the back). */
export function shoreline(x: number) {
  return -0.36 - 0.06 * Math.sin(x * 3.1 + 0.6) - 0.03 * Math.sin(x * 7.3);
}
