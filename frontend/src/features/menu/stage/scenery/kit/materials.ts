import { AdditiveBlending } from "three";

/** Adds its light to what's behind instead of covering it, and hides nothing: halos, sparks, fog glows. */
export const GLOW = { transparent: true, depthWrite: false, blending: AdditiveBlending } as const;

/** A glow bright enough to burn past white: left out of tone mapping (flames, bulbs, fissures). */
export const HOT_GLOW = { ...GLOW, toneMapped: false } as const;

/** See-through and never hiding what's drawn after it: smoke, mist, decals lying on the floor. */
export const SHEER = { transparent: true, depthWrite: false } as const;
