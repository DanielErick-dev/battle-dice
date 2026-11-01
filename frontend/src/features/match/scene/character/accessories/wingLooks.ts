import type { PropId } from "../core/props";

/** A pair of wings worn on the back: how they look and beat. */
export interface WingsLook {
  prop: PropId;
  /** How tall the pair stands, in model units (Meshy figures stand 1.7). */
  height: number;
  /** Where their root sits from the upper spine, in the figure's frame (+y up, +z ahead): on the back. */
  root: [number, number, number];
  /** How far out from the spine each wing turns (model units): on the shoulder blade, so its inner edge stays clear of the shoulder. */
  hinge: number;
  /** Each wing swept back from flat (radians), at rest. */
  sweep: number;
  /**
   * A full beat (stroke ±1, see Wings): how far the tips swing back and forth (radians about the
   * spine) and rise and fall (radians about the root, the tips going up and down).
   */
  swing: number;
  lift: number;
  /** Where a wing's tip is, in the prop's units (see PROP_HEIGHT): out from the spine, and up. */
  tip: [number, number];
  /** Beating on their own: how much of a full beat (0 to 1), and how fast (radians a second). */
  idle: number;
  beatRate: number;
  /** See-through ice, glowing a little (the fairy's); otherwise as modelled. */
  icy: boolean;
}

export const WINGS = {
  // The Crystal Fairy's: shoulders to thighs, quick and light, of translucent ice.
  fairy: {
    prop: "fairyWings",
    height: 0.95,
    root: [0, 0.02, -0.11],
    hinge: 0.03,
    sweep: 0.45,
    swing: 0.3,
    lift: 0.2,
    tip: [0.75, 0.9],
    idle: 1,
    beatRate: 4.2,
    icy: true,
  },
  // Seraphiel's feathered wings, and his burnt ones once fallen: tips above his head, great slow
  // beats at rest, and mighty ones when driven (his entrance).
  seraph: {
    prop: "seraphWings",
    height: 1.6,
    root: [0, 0.12, -0.2],
    hinge: 0.09,
    sweep: 0.4,
    swing: 0.2,
    lift: 0.3,
    tip: [0.72, 0.9],
    idle: 0.4,
    beatRate: 1.8,
    icy: false,
  },
  fallen: {
    prop: "fallenWings",
    height: 1.6,
    root: [0, 0.12, -0.2],
    hinge: 0.09,
    sweep: 0.4,
    swing: 0.2,
    lift: 0.28,
    tip: [0.72, 0.9],
    idle: 0.35,
    beatRate: 1.4,
    icy: false,
  },
} as const satisfies Record<string, WingsLook>;
export type WingsId = keyof typeof WINGS;
