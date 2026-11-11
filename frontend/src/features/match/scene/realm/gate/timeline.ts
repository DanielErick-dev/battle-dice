const OPEN_SECONDS = 0.45;
const HOLD_SECONDS = 2.2;
const CLOSE_SECONDS = 0.8;

/** 0→1 while opening, 1 while held, 1→0 while closing, by seconds since the gate appeared. */
export function gateStrength(age: number): number {
  if (age < OPEN_SECONDS) return age / OPEN_SECONDS;
  if (age < HOLD_SECONDS) return 1;
  return Math.max(0, 1 - (age - HOLD_SECONDS) / CLOSE_SECONDS);
}

/** How wide the gate stands: it widens from a fifth as it opens and stays full after. */
export function gateWidth(age: number): number {
  return 0.2 + 0.8 * Math.min(1, age / OPEN_SECONDS);
}
