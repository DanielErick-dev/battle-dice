import { Color } from "three";

export const LOCKED = new Color("#ff4b5c");

/** Seconds the bay stays dark while Unidade Alva stands switched off, head bowed (her intro's hold). */
export const POWER_OFF_SECONDS = 1.5;
/** Its lights stutter this long as she lifts her head, then climb the rest of the way over POWER_RAMP_SECONDS. */
export const POWER_FLICKER_SECONDS = 0.9;
export const POWER_RAMP_SECONDS = 1.6;
/** How much of the stage light is left while it's off. */
export const DARK_LIGHT = 0.25;

/** The stutter's flashes: from, to (seconds after power-on) and how bright; dark in between. */
const FLASHES = [
  { from: 0, to: 0.07, level: 0.5 },
  { from: 0.2, to: 0.26, level: 0.3 },
  { from: 0.42, to: 0.56, level: 0.65 },
  { from: 0.7, to: POWER_FLICKER_SECONDS, level: 0.4 },
];
const RAMP_FROM = 0.4;

/** 0 while switched off, 1 once powered up, `seconds` into her intro. */
export function powerAt(seconds: number): number {
  const since = seconds - POWER_OFF_SECONDS;
  if (since < 0) return 0;
  if (since < POWER_FLICKER_SECONDS) return FLASHES.find(({ from, to }) => since >= from && since < to)?.level ?? 0;
  const ramp = Math.min(1, (since - POWER_FLICKER_SECONDS) / POWER_RAMP_SECONDS);
  return RAMP_FROM + (1 - RAMP_FROM) * ramp * ramp * (3 - 2 * ramp);
}
