import { useMemo } from "react";
import { Color } from "three";

/** `color` pushed `strength` times past itself: past 1.0 it blooms. */
export function glowColor(color: string, strength: number): Color {
  return new Color(color).multiplyScalar(strength);
}

/** `glowColor`, kept while `color` stays the same. */
export function useGlowColor(color: string, strength: number): Color {
  return useMemo(() => glowColor(color, strength), [color, strength]);
}
