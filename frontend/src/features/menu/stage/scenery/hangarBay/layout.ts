import { Color } from "three";

export const LOCKED = new Color("#ff4b5c");

/** Seconds the bay stays dark while Unidade Alva stands switched off, head bowed (her intro's hold). */
export const POWER_OFF_SECONDS = 2;
/** Its lights flicker this long, then come up over POWER_RAMP_SECONDS. */
export const POWER_FLICKER_SECONDS = 0.4;
export const POWER_RAMP_SECONDS = 0.6;
/** How much of the stage light is left while it's off. */
export const DARK_LIGHT = 0.25;

/** 0 while switched off, 1 once powered up, `seconds` into her intro. */
export function powerAt(seconds: number): number {
  const since = seconds - POWER_OFF_SECONDS;
  if (since <= 0) return 0;
  // Two stutters of light before it holds.
  if (since < POWER_FLICKER_SECONDS) return Math.floor(since / 0.08) % 2 === 0 ? 0.6 : 0;
  const ramp = Math.min(1, (since - POWER_FLICKER_SECONDS) / POWER_RAMP_SECONDS);
  return ramp * ramp * (3 - 2 * ramp);
}
