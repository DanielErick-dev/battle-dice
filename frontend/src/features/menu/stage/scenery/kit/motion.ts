/** `amplitude * sin(t * rate + phase)`: the swing every bob, sway and pulse in the habitats is built from. */
export function wave(t: number, amplitude: number, rate: number, phase = 0): number {
  return amplitude * Math.sin(t * rate + phase);
}

/** The upper half of a sine raised to `power`: a brief flash, then rest (fireflies, glints, heartbeats). */
export function spike(t: number, rate: number, phase: number, power: number): number {
  return Math.max(0, Math.sin(t * rate + phase)) ** power;
}

/** How far through a repeating cycle `t` is, 0 to 1; `offset` (in cycles) staggers siblings. */
export function cycle(t: number, rate: number, offset = 0): number {
  return (t * rate + offset) % 1;
}

/** Two overlapping waves, `[amplitude, rate]` each: a slow lick and a quick tremble. */
export interface Flicker {
  slow: readonly [amplitude: number, rate: number];
  fast: readonly [amplitude: number, rate: number];
}

/** A flame's size about 1; the phases keep neighbouring flames out of step. */
export function flicker(t: number, { slow, fast }: Flicker, slowPhase = 0, fastPhase = 0): number {
  return 1 + slow[0] * Math.sin(t * slow[1] + slowPhase) + fast[0] * Math.sin(t * fast[1] + fastPhase);
}

/** How a flickering sprite's size follows its flicker. */
export type FlameShape =
  /** Narrower as it leaps, wider as it ducks, like a candle flame. */
  | { kind: "stretch"; width: number; height: number }
  /** Both sides swell together, flat on the screen. */
  | { kind: "grow"; width: number; height: number }
  /** Swells on every axis: a round haze. */
  | { kind: "uniform"; size: number };

export function flameScale(shape: FlameShape, size: number): [number, number, number] {
  switch (shape.kind) {
    case "stretch":
      return [shape.width * size, shape.height * (2 - size), 1];
    case "grow":
      return [shape.width * size, shape.height * size, 1];
    case "uniform":
      return [shape.size * size, shape.size * size, shape.size * size];
  }
}

/** Climbs `step` and starts again at the bottom once past `top`. */
export function rise(height: number, step: number, top: number): number {
  const next = height + step;
  return next > top ? next - top : next;
}

/** Sinks `step` and starts again at `top` once under the floor. */
export function fall(height: number, step: number, top: number): number {
  const next = height - step;
  return next < 0 ? next + top : next;
}

/** 1 in the middle of a climb of `span`, fading to 0 over its first 1/`fadeIn` and last 1/`fadeOut`. */
export function fadeAtEnds(height: number, span: number, fadeIn: number, fadeOut: number): number {
  return Math.min(1, height * fadeIn, (span - height) * fadeOut);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Something circling the stage's centre: where it starts, how far out, and radians a second. */
export interface Circling {
  angle: number;
  radius: number;
  speed: number;
}

/** Its [x, z] on the floor at time `t`. */
export function circlingAt({ angle, radius, speed }: Circling, t: number): [number, number] {
  const at = angle + t * speed;
  return [Math.cos(at) * radius, Math.sin(at) * radius];
}
