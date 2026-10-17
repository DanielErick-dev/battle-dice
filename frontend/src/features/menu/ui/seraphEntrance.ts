import { DESCENT_SECONDS } from "@/features/match/scene/character/HeavenDescent";

/**
 * Seraphiel's entrance on the menu stage, timed from the start of his descent: he glides down out of
 * the sky beating his wings hard, each downstroke sending a gust of wind through the sanctuary
 * (feathers blown away, clouds pushed back, columns shaking, the view jolting), stronger the nearer
 * the ground. Landed, the wind drops and his wings settle into their idle beat.
 */

/** Seconds between two beats on the way down. */
const BEAT_SECONDS = 0.9;
/** How long the wings take to settle once he's landed. */
const SETTLE_SECONDS = 0.6;
/** How long a gust takes to die down after the downstroke that sent it. */
const GUST_FADE_SECONDS = 0.9;

/** When the whole entrance is over: the wings back to their idle beat. */
export const ENTRANCE_SECONDS = DESCENT_SECONDS + SETTLE_SECONDS;

/**
 * Every downstroke's gust: when it lands (the wings beating down hardest) and how strong (0 to 1),
 * growing as he nears the ground. Only on the way down.
 */
export const GUSTS: readonly { at: number; strength: number }[] = Array.from(
  { length: Math.floor(DESCENT_SECONDS / BEAT_SECONDS) },
  (_, beat) => {
    const at = (beat + 0.5) * BEAT_SECONDS;
    return { at, strength: 0.45 + 0.55 * (at / DESCENT_SECONDS) };
  },
);

/**
 * Where the wings are in their beat `t` seconds into the entrance (see Wings' `stroke`): 1 raised
 * high and swept back, -1 beaten down and forward; null once it's over and they beat on their own.
 */
export function wingStroke(t: number): number | null {
  if (t < 0 || t >= ENTRANCE_SECONDS) return null;
  // Beating hard all the way down.
  if (t < DESCENT_SECONDS) return Math.sin((t / BEAT_SECONDS) * Math.PI * 2);
  // Landed: easing back to rest from where the last beat left them.
  const landed = Math.sin((DESCENT_SECONDS / BEAT_SECONDS) * Math.PI * 2);
  return landed * (1 - (t - DESCENT_SECONDS) / SETTLE_SECONDS);
}

/** How strong the wind is `t` seconds into the entrance, 0 to 1: a gust off every downstroke, dying down. */
export function gustAt(t: number): number {
  let gust = 0;
  for (const { at, strength } of GUSTS) {
    const since = t - at + 0.12;
    if (since < 0) continue;
    // Up in an instant, then dying down.
    const rise = Math.min(1, since / 0.12);
    gust = Math.max(gust, strength * rise * Math.exp(-Math.max(0, since - 0.12) * (3 / GUST_FADE_SECONDS)));
  }
  return gust;
}
