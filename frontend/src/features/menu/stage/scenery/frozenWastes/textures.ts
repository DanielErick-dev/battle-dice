import type { GroundDressing } from "../kit/groundDressing";
import type { NoiseLook } from "../kit/textures";

/** Bjorn's trail trampled through the snow, grey stones showing through, an icy blue. */
const FROZEN_GROUND: GroundDressing = {
  wash: { colour: "#60a5fa", alpha: 0.28 },
  path: {
    kind: "dirt",
    colour: "rgba(170,195,215,0.8)",
    edge: "rgba(110,140,170,0.45)",
    width: [0.14, 0.26],
    wind: 0.05,
  },
  litter: [
    { shape: "pebble", colours: ["#6b7280", "#9ca3af"], count: 45, size: 3 },
    { shape: "shard", colours: ["rgba(200,235,255,0.85)"], count: 40, size: 3 },
  ],
};
export const SNOW: NoiseLook = {
  base: [214, 228, 240],
  dark: [160, 184, 208],
  light: [246, 250, 255],
  fadeOut: true,
  dress: FROZEN_GROUND,
};
export const STONE: NoiseLook = {
  base: [58, 66, 78],
  dark: [30, 36, 46],
  light: [96, 108, 124],
  fadeOut: false,
};
