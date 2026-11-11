import { easeOutCubic } from "@/features/characters/shared/easing";

/** How fast the track rises into view and sinks away (presence per second). */
const APPEAR_RATE = 0.8;
const VANISH_RATE = 0.7;
/** Where tiles come from: up out of the lava below, or down from the sky. */
export const ARRIVAL_OFFSET = { infernal: -5, celestial: 7 } as const;

/** The track's presence eased `delta` seconds towards shown (1) or gone (0). */
export function stepPresence(presence: number, open: boolean, delta: number): number {
  const rate = open ? APPEAR_RATE : VANISH_RATE;
  return presence + ((open ? 1 : 0) - presence) * Math.min(1, delta * rate * 3);
}

/** How far tile `index` of `count` has arrived: they come in order from the portal, each over its own slice. */
export function tileArrival(presence: number, index: number, count: number): number {
  return Math.min(1, Math.max(0, presence * (count + 1.5) - index));
}

/** The corridor walls' height share: they rise a little ahead of the tiles (never 0, see the scene README). */
export function wallRise(presence: number): number {
  return Math.max(0.001, easeOutCubic(Math.min(1, presence * 1.2)));
}
