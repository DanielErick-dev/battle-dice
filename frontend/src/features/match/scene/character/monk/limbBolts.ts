import { Vector3 } from "three";
import { jag } from "../shared/boltStrips";
import { noise } from "../shared/hash";

/** A fork off every bolt: its length as a share of the bolt's, and how far it veers off. */
const BRANCH_LENGTH = 0.4;
const BRANCH_ANGLE = 0.9;
/** How far a spark off a hand reaches (share of the figure's height). */
const SPARK_MIN = 0.05;
const SPARK_MAX = 0.13;

/** Working vectors (frames run one at a time, so every bolt can share them). */
const scratch = { side: new Vector3(), toCamera: new Vector3(), along: new Vector3() };

/**
 * Spreads `out` evenly along the trail's path (newest point first). False when the path is
 * shorter than `minLength`: the limb is barely moving.
 */
export function resample(trail: readonly Vector3[], out: Vector3[], minLength: number): boolean {
  if (trail.length < 2) return false;
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += trail[i].distanceTo(trail[i - 1]);
  if (total < minLength) return false;
  let i = 1;
  let walked = 0;
  out.forEach((point, k) => {
    const target = (total * k) / (out.length - 1);
    while (i < trail.length - 1 && walked + trail[i].distanceTo(trail[i - 1]) < target) {
      walked += trail[i].distanceTo(trail[i - 1]);
      i++;
    }
    const step = trail[i].distanceTo(trail[i - 1]) || 1;
    point.lerpVectors(trail[i - 1], trail[i], Math.min(1, (target - walked) / step));
  });
  return true;
}

/** Lays `bolt` out as a spark from `from`, off in a random direction, then jagged. */
export function spark(bolt: Vector3[], from: Vector3, seed: number, size: number) {
  scratch.along
    .set(noise(seed + 1) - 0.5, noise(seed + 2) - 0.5, noise(seed + 3) - 0.5)
    .normalize()
    .multiplyScalar(size * (SPARK_MIN + (SPARK_MAX - SPARK_MIN) * noise(seed + 4)));
  bolt.forEach((point, k) => point.copy(from).addScaledVector(scratch.along, k / (bolt.length - 1)));
  jag(bolt, seed + 5, size * 0.5);
}

/** Turns `points` (a lit bolt) into its fork: from a middle kink, off to one side, then jagged. */
export function branch(points: Vector3[], seed: number, cameraPosition: Vector3, size: number) {
  const from = points[1 + Math.floor(noise(seed) * (points.length - 3))].clone();
  scratch.along.subVectors(points.at(-1)!, points[0]);
  const length = scratch.along.length() * BRANCH_LENGTH;
  scratch.toCamera.subVectors(cameraPosition, from);
  scratch.side.crossVectors(scratch.along, scratch.toCamera).normalize();
  const direction = scratch.along
    .normalize()
    .addScaledVector(scratch.side, (noise(seed + 9) < 0.5 ? -1 : 1) * BRANCH_ANGLE)
    .normalize();
  points.forEach((point, k) => point.copy(from).addScaledVector(direction, (length * k) / (points.length - 1)));
  jag(points, seed + 31, size * 0.6);
}
