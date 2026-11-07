import type { RefObject } from "react";

export interface SceneryProps {
  /** How hard the wind blows through the stage (0 to 1): Seraphiel's wingbeats. */
  gust: RefObject<number>;
  /** A fresh key per intro played (each pick and each replay), for scenery that acts on its beats. */
  intro: string;
}
