import type { ComponentType, RefObject } from "react";
import { AlchemyLab } from "./alchemyLab/AlchemyLab";
import { BloodRoseGarden } from "./bloodRoseGarden/BloodRoseGarden";
import { BurningShrine } from "./burningShrine/BurningShrine";
import { CardTable } from "./cardTable/CardTable";
import { CrystalGrove } from "./crystalGrove/CrystalGrove";
import { ElvenGlade } from "./elvenGlade/ElvenGlade";
import { FrozenWastes } from "./frozenWastes/FrozenWastes";
import { GearWorks } from "./gearWorks/GearWorks";
import { Graveyard } from "./graveyard/Graveyard";
import { HangarBay } from "./hangarBay/HangarBay";
import { MistRuins } from "./mistRuins/MistRuins";
import { SakuraCourtyard } from "./sakuraCourtyard/SakuraCourtyard";
import { Sanctuary } from "./sanctuary/Sanctuary";
import { Scriptorium } from "./scriptorium/Scriptorium";
import { StormTemple } from "./stormTemple/StormTemple";
import { Tribunal } from "./tribunal/Tribunal";
import { SunkenTemple } from "./sunkenTemple/SunkenTemple";
import { VoidRift } from "./voidRift/VoidRift";
import { WindPeak } from "./windPeak/WindPeak";
import { WitchHollow } from "./witchHollow/WitchHollow";

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
  // Lit gold like her sacred fire, not the character's blue; no blue motes drifting over the stone either.
  tribunal: { component: Tribunal, light: "#ffcf7a", weather: true },
  // Under the sea the gold is lit by a teal wash; the bubbles stand in for the motes.
  sunkenTemple: { component: SunkenTemple, light: "#3cc6c0", weather: true },
  gearworks: { component: GearWorks },
  hangar: { component: HangarBay, light: "#8ecbff" },
  glade: { component: ElvenGlade, weather: true },
  grove: { component: CrystalGrove, weather: true },
  peak: { component: WindPeak, weather: true },
  temple: { component: StormTemple },
  witchHollow: { component: WitchHollow },
  alchemyLab: { component: AlchemyLab },
  cardTable: { component: CardTable },
  // Its own falling petals take the place of the rising motes.
  sakuraCourtyard: { component: SakuraCourtyard, weather: true },
} as const satisfies Record<string, Scenery>;

export type SceneryId = keyof typeof SCENERY;
