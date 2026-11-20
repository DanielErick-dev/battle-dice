import type { EffectsQuality } from "@/features/shared/config";

/** One rung of rendering cost: pixel density, antialiasing samples, bloom mip levels. */
export interface QualityStep {
  dpr: number | [number, number];
  multisampling: number;
  bloomLevels: number;
  bloomIntensity: number;
}

/**
 * From the full look down to the cheapest, dropped one rung at a time while frames run slow and climbed back when
 * there's room: resolution goes first (least visible), then antialiasing, then bloom detail.
 */
export const QUALITY_STEPS: readonly QualityStep[] = [
  { dpr: [1, 1.5], multisampling: 4, bloomLevels: 8, bloomIntensity: 1.15 },
  { dpr: 1.25, multisampling: 4, bloomLevels: 6, bloomIntensity: 1.1 },
  { dpr: 1, multisampling: 2, bloomLevels: 5, bloomIntensity: 1 },
  { dpr: 1, multisampling: 0, bloomLevels: 5, bloomIntensity: 0.9 },
];

/** The rung a chosen quality starts on: "low" is the cheapest. */
export function firstStep(quality: EffectsQuality): number {
  return quality === "low" ? QUALITY_STEPS.length - 1 : 0;
}

/** One rung cheaper or dearer, never past either end (nor dearer than the chosen quality allows). */
export function stepQuality(step: number, change: 1 | -1, quality: EffectsQuality): number {
  return Math.min(QUALITY_STEPS.length - 1, Math.max(firstStep(quality), step + change));
}
