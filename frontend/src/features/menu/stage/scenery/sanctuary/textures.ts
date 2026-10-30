import type { GroundDressing } from "../kit/groundDressing";
import type { NoiseLook } from "../kit/textures";

export const MARBLE: NoiseLook = {
  base: [236, 232, 224],
  dark: [200, 192, 182],
  light: [252, 250, 246],
  fadeOut: false,
};
/** A way of gold-veined slabs across the dais, feathers fallen from his wings, a warm glow. */
const HEAVEN_GROUND: GroundDressing = {
  wash: { colour: "#fbbf24", alpha: 0.2 },
  path: { kind: "slabs", colour: "#e8d9a8", edge: "#c9a227", width: [0.18, 0.28], wind: 0 },
  litter: [{ shape: "leaf", colours: ["rgba(255,255,255,0.95)", "rgba(255,244,214,0.9)"], count: 50, size: 6 }],
};
export const DAIS_TOP: NoiseLook = { ...MARBLE, dress: HEAVEN_GROUND };
