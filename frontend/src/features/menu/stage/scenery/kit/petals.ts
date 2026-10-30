import { fall } from "./motion";

/** A petal drifting down, swaying and tumbling; `height` is where it is now, moved on each frame. */
export interface Petal {
  x: number;
  z: number;
  height: number;
  /** Units a second it sinks. */
  speed: number;
  phase: number;
  /** Radians a second it tumbles end over end. */
  spin: number;
  /** The rock about its long axis: `sin(t * rate + phase)`. */
  flutter: { rate: number; phase: number };
}

export interface PetalPose {
  position: [number, number, number];
  rotation: [number, number, number];
}

/** Sinks the petal by a frame's worth, back to `top` once it reaches the floor. */
export function settle(petal: Petal, delta: number, top: number): void {
  petal.height = fall(petal.height, petal.speed * delta, top);
}

/** Where the petal is and how it's turned at time `t`, swaying round its own column. */
export function petalPose(petal: Petal, t: number): PetalPose {
  return {
    position: [
      petal.x + Math.sin(t * 0.7 + petal.phase) * 0.12,
      petal.height,
      petal.z + Math.cos(t * 0.5 + petal.phase) * 0.06,
    ],
    rotation: [t * petal.spin + petal.phase, petal.phase, Math.sin(t * petal.flutter.rate + petal.flutter.phase) * 0.8],
  };
}
