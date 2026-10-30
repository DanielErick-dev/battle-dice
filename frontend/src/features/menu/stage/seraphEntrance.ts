import { DESCENT_SECONDS } from "@/features/match/scene/character/seraphiel/HeavenDescent";

// Seraphiel's menu entrance, timed from the start of his descent: each downstroke sends a gust through
// the sanctuary, stronger the nearer the ground; landed, the wind drops and his wings settle.

const BEAT_SECONDS = 0.9;
const SETTLE_SECONDS = 0.6;
const GUST_FADE_SECONDS = 0.9;

export const ENTRANCE_SECONDS = DESCENT_SECONDS + SETTLE_SECONDS;

/** Every downstroke's gust on the way down: when the wings beat down hardest, and how strong (0 to 1). */
export const GUSTS: readonly { at: number; strength: number }[] = Array.from(
  { length: Math.floor(DESCENT_SECONDS / BEAT_SECONDS) },
  (_, beat) => {
    const at = (beat + 0.5) * BEAT_SECONDS;
    return { at, strength: 0.45 + 0.55 * (at / DESCENT_SECONDS) };
  },
);

/** Wings' `stroke` at `t`: 1 raised and swept back, -1 beaten down; null once they beat on their own. */
export function wingStroke(t: number): number | null {
  if (t < 0 || t >= ENTRANCE_SECONDS) return null;
  if (t < DESCENT_SECONDS) return Math.sin((t / BEAT_SECONDS) * Math.PI * 2);
  // Landed: easing back to rest from where the last beat left them.
  const landed = Math.sin((DESCENT_SECONDS / BEAT_SECONDS) * Math.PI * 2);
  return landed * (1 - (t - DESCENT_SECONDS) / SETTLE_SECONDS);
}

/** Wind strength at `t`, 0 to 1: each gust rises in an instant, then dies down. */
export function gustAt(t: number): number {
  let gust = 0;
  for (const { at, strength } of GUSTS) {
    const since = t - at + 0.12;
    if (since < 0) continue;
    const rise = Math.min(1, since / 0.12);
    gust = Math.max(gust, strength * rise * Math.exp(-Math.max(0, since - 0.12) * (3 / GUST_FADE_SECONDS)));
  }
  return gust;
}
