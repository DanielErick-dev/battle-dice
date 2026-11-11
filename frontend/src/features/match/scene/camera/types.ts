import type { Vector3 } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";

/** A figure playing one of its own moves, filmed from the front (see spotlightOf). */
export interface CameraSpotlight {
  key: string;
  /** Where the figure stands. */
  position: Vec3;
  /** The way it faces: the camera comes round to stand in front of it. */
  facing: Vec3;
  /** Share of the follow distance to film it from. */
  distance: number;
  seconds: number;
  /** Radians above the horizon, when not the usual SPOT_ELEVATION. */
  elevation?: number;
}

/** A live position to ride along with for CHASE_SECONDS after its `key` first shows, then back to the focus. */
export interface CameraChase {
  key: number;
  position: Vector3;
  /** How long to ride along, when not CHASE_SECONDS. */
  seconds?: number;
}

/** Following the focus up close or from midway, or framing the whole board. */
export type CameraFraming = "close" | "mid" | "board";
