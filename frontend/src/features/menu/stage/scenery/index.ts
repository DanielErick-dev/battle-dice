import type { ComponentType, RefObject } from "react";
import { BloodRoseGarden } from "./BloodRoseGarden";
import { BurningShrine } from "./BurningShrine";
import { FrozenWastes } from "./FrozenWastes";
import { Graveyard } from "./Graveyard";
import { MistRuins } from "./MistRuins";
import { Sanctuary } from "./Sanctuary";
import { Scriptorium } from "./Scriptorium";
import { VoidRift } from "./VoidRift";

export interface SceneryProps {
  /** How hard the wind blows through the stage (0 to 1): Seraphiel's wingbeats. */
  gust: RefObject<number>;
}

/** A character's own ground on the menu stage, in place of the rune pedestal (origin on the floor). */
export interface Scenery {
  component: ComponentType<SceneryProps>;
  /** Tints the stage's coloured lights instead of the character's accent. */
  light?: string;
  /** A darker stage: dimmer lights and a black glow under the canvas. */
  dim?: boolean;
  /** Brings its own weather (snow, ash…), so the rising motes stay off. */
  weather?: boolean;
}

export const SCENERY = {
  // A graveyard is lit by a cold, sickly glimmer rather than the character's bright accent.
  graveyard: { component: Graveyard, light: "#6f8a6c", dim: true },
  scriptorium: { component: Scriptorium },
  tundra: { component: FrozenWastes, weather: true },
  sanctuary: { component: Sanctuary },
  voidRift: { component: VoidRift, dim: true },
  mistRuins: { component: MistRuins, dim: true },
  burningShrine: { component: BurningShrine, weather: true },
  bloodRoseGarden: { component: BloodRoseGarden, weather: true },
} as const satisfies Record<string, Scenery>;

export type SceneryId = keyof typeof SCENERY;
