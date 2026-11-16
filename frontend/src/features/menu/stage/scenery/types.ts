import type { RefObject } from "react";

export interface SceneryProps {
  /** How hard the wind blows through the stage (0 to 1): Seraphiel's wingbeats. */
  gust: RefObject<number>;
  /** A fresh key per intro played (each pick and each replay), for scenery that acts on its beats. */
  intro: string;
  /** Sets the share of the stage's light that's on (1 unless the scenery dims it, as the hangar does while off). */
  setLights: (level: number) => void;
  /** Seconds since the figure's intro started, null until its model is in. */
  introSeconds: () => number | null;
}
