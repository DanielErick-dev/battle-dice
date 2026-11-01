/** Easing curves and per-frame approaches shared by the character effects (pure, see easing.test.ts). */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** How far the clock `t` is through the `seconds` that start at `from`, from 0 to 1. */
export function ramp(t: number, from: number, seconds: number): number {
  return clamp01((t - from) / seconds);
}

/** Hermite smoothstep on 0–1: eases in and out. */
export function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

export function easeOutQuad(x: number): number {
  return 1 - (1 - x) ** 2;
}

export function easeOutCubic(x: number): number {
  return 1 - (1 - x) ** 3;
}

/** Overshoots a little before settling, so things snap into being. */
export function easeOutBack(x: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
}

/** `current` eased towards `target` over `delta` seconds at `rate` per second, the same at any frame rate. */
export function approach(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * delta));
}

/** `current` moved a share `delta * rate` (at most all the way) of its distance to `target`. */
export function approachLinear(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * Math.min(1, delta * rate);
}

/** A strength easing up to 1 at `grow` while `on`, and back down to 0 at `fade` once off. */
export function growOrFade(current: number, on: boolean, grow: number, fade: number, delta: number): number {
  const target = on ? 1 : 0;
  return approach(current, target, target > current ? grow : fade, delta);
}
