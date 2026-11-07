/** Seconds a levitating figure takes to rise to its full height, and to come back down. */
export const RISE_SECONDS = 2.6;
const FALL_SECONDS = 1.5;

/** Levitation progress (0 grounded, 1 fully up) after `delta` seconds of rising (`up`) or landing. */
export function stepLevitation(progress: number, up: boolean, delta: number): number {
  const next = progress + (up ? delta / RISE_SECONDS : -delta / FALL_SECONDS);
  return Math.min(1, Math.max(0, next));
}

/** Share of the full hover height at a levitation progress: a slow start and a soft arrival. */
export function levitationLift(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}
