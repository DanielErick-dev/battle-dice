import type { Vector3 } from "three";

/** Where every figure stands right now, written by PlayerToken each frame so the scenery can react (crows take off). */
export const figurePositions = new Map<string, Vector3>();
