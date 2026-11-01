import type { GroundDressing } from "../kit/groundDressing";
import type { NoiseLook } from "../kit/textures";

/** A grave-digger's track of grey earth, bone chips and dead leaves under a sickly green. */
const GRAVE_GROUND: GroundDressing = {
  wash: { colour: "#6f8a6c", alpha: 0.35 },
  path: { kind: "dirt", colour: "rgba(80,74,64,0.9)", edge: "rgba(30,26,20,0.6)", width: [0.14, 0.26], wind: 0.05 },
  litter: [
    { shape: "shard", colours: ["rgba(225,215,190,0.9)"], count: 50, size: 4 },
    { shape: "leaf", colours: ["#4a3b2a", "#3a3020"], count: 60, size: 5 },
  ],
  glow: { colour: "#7dff9a", count: 3 },
};
export const SOIL: NoiseLook = {
  base: [34, 27, 21],
  dark: [12, 10, 8],
  light: [62, 52, 40],
  fadeOut: true,
  dress: GRAVE_GROUND,
};
export const MOUND: NoiseLook = { base: [34, 27, 21], dark: [12, 10, 8], light: [62, 52, 40], fadeOut: false };
export const STONE: NoiseLook = { base: [70, 72, 68], dark: [36, 38, 35], light: [104, 106, 98], fadeOut: false };
