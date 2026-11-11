import { Vector3 } from "three";
import type { BoardLayout } from "@/features/shared/board/boardLayout";
import { FIGURE_HEIGHT } from "@/features/characters/core/figure";

export const BASE_DIRECTION = new Vector3(0, 12, 12.5).normalize();
export const BASE_DISTANCE = Math.hypot(12, 12.5);
export const BASE_FOV = 40;
/** Grid extent the base distance was tuned for (the 5×4 training board). */
const BASE_WIDTH = 10.8;
const BASE_DEPTH = 8.55;
/** Below this width/height ratio the camera backs off so the framed area stays in view. */
export const FIT_ASPECT = 1.1;
/** How quickly the camera catches up with its goal (higher = snappier). */
export const FOLLOW_RATE = 3;
/** A spotlit figure is framed at its chest, from this far above the horizon (radians). */
export const SPOT_HEIGHT = FIGURE_HEIGHT * 0.55;
export const SPOT_ELEVATION = 0.42;
/** Share of the follow distance the Void is chased from while it works on a tile. */
export const CHASE_DISTANCE = 0.8;
export const CHASE_SECONDS = 2.2;
/** How quickly the camera swings round to the front of a spotlit figure, and back after. */
export const SPOT_RATE = 3.5;

/** Winner close-up (distance factor) while the camera circles them. */
export const VICTORY_DISTANCE = 0.55;
export const TRAUMA_DECAY = 1.4;
export const SHAKE_AMPLITUDE = 0.45;
export const FOV_KICK_DEGREES = 9;
export const FOV_KICK_DECAY = 2.2;

/** How much bigger than the training board this layout is; scales camera, fog and stars. */
export function boardScaleFor(layout: BoardLayout): number {
  return Math.max(1, layout.width / BASE_WIDTH, layout.depth / BASE_DEPTH);
}
