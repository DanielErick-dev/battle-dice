import { Color } from "three";

/** The night sea's horizon: the scene's background and fog start here (see ArenaEnvironment). */
export const MORTAL_HORIZON = "#121821";

/** Sky colours per world; the fog and background follow the horizon. */
export const SKY = {
  mortal: { horizon: new Color(MORTAL_HORIZON), zenith: new Color("#030508") },
  infernal: { horizon: new Color("#5a1206"), zenith: new Color("#120203") },
  celestial: { horizon: new Color("#c9a47c"), zenith: new Color("#2f4f9e") },
} as const;

/** The hemisphere light's sky and ground colours per world (red glow rising from the lava, warm daylight). */
export const HEMI_SKY = {
  mortal: new Color("#6c7c96"),
  infernal: new Color("#ff6a3a"),
  celestial: new Color("#fff1d0"),
};
export const HEMI_GROUND = {
  mortal: new Color("#0b0a0e"),
  infernal: new Color("#3a0802"),
  celestial: new Color("#4a5a8a"),
};
