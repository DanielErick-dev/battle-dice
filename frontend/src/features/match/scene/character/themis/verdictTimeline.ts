import { DEFAULT_TIMINGS } from "../../../config";

const WEIGH_SECONDS = DEFAULT_TIMINGS.verdictWeighMs / 1000;
const TIP_SECONDS = DEFAULT_TIMINGS.verdictTipMs / 1000;
/** It drops from the sky and fades in, then lingers after the strike before fading out. */
const APPEAR_SECONDS = 0.7;
const LINGER_SECONDS = 0.5;
const FADE_SECONDS = 0.8;
const DROP_HEIGHT = 4;
/** Radians: the swing while weighing (dying away), and the final drop on the attacker's side. */
const SWING = 0.3;
export const TIPPED = -0.38;
/** Seconds after tipping that judgment strikes from the lowered pan. */
const STRIKE_DELAY = 0.35;

/** Where the Silent Verdict's scale is in its show, `t` seconds after it appeared. */
export interface VerdictFrame {
  /** How solid the whole scale is (0 gone). */
  opacity: number;
  /** How far above its place it still is, coming down from the sky. */
  drop: number;
  /** The beam's tilt (radians, the attacker's side down when negative). */
  angle: number;
  /** Seconds since the strike from the lowered pan, negative before it. */
  struck: number;
}

/** The scale at `t`, having started to tip at `tipAt` (null while still weighing). */
export function verdictFrame(t: number, tipAt: number | null): VerdictFrame {
  const tipped = tipAt === null ? 0 : t - tipAt;
  const appear = Math.min(1, t / APPEAR_SECONDS);
  const gone = tipAt === null ? 0 : (tipped - TIP_SECONDS - LINGER_SECONDS) / FADE_SECONDS;
  // Weighing swings to and fro, dying away; tipping eases down onto the attacker's side.
  const weighing = SWING * Math.exp(-t / WEIGH_SECONDS) * Math.sin(t * 5.5);
  const settle = Math.min(1, tipped / 0.45);
  return {
    opacity: Math.max(0, Math.min(appear, 1 - gone)),
    drop: DROP_HEIGHT * (1 - appear) ** 3,
    angle: tipAt === null ? weighing : weighing * (1 - settle) + TIPPED * (1 - (1 - settle) ** 3),
    struck: tipAt === null ? -1 : tipped - STRIKE_DELAY,
  };
}

/** The judge's blue glow: steady while weighing, a flash at the strike that fades. */
export function verdictGlow({ struck, opacity }: VerdictFrame): number {
  return struck > 0 ? Math.max(0, 1 - struck / 1.1) * opacity : 0.5 * opacity;
}
