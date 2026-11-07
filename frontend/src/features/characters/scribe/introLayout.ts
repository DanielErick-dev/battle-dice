import { Color } from "three";

/** Sizes in units of his height: the page he writes on, each scroll's sheet, the circle on the floor. */
export const PAGE_WIDTH = 0.24;
export const PAGE_HEIGHT = 0.32;
export const SHEET_WIDTH = 0.17;
export const SHEET_HEIGHT = 0.25;
export const CIRCLE_SIZE = 1.05;
export const ROD_RADIUS = 0.007;
/** Where the four scrolls hang round him: angle from his front (radians), radius and height. */
export const SCROLLS = [-1.95, -0.95, 0.95, 1.95].map((angle, index) => ({
  angle,
  radius: 0.5,
  height: 0.62 + (index % 2) * 0.1,
}));
/** Seconds the page takes to unroll before he writes, and to burn once it splits into scrolls. */
export const PAGE_UNROLL_SECONDS = 0.6;
export const PAGE_BURN_SECONDS = 0.6;
/** Seconds the circle on the floor keeps writing itself after the page is done. */
export const CIRCLE_EXTRA_SECONDS = 0.9;
/** Seconds the scrolls take to fly out of the page, to unroll, and to burn away. */
export const FLY_SECONDS = 0.8;
export const UNROLL_SECONDS = 0.7;
export const BURN_SECONDS = 1.2;
/** Ink sparks shed by the pen as he writes: how many live at once, and for how long. */
export const SPARKS = 140;
export const SPARK_LIFE = 1.6;
/** Embers each scroll sheds as it burns. */
export const EMBERS = 36;
/** The glow of fresh blood in his writing: on the page, the scrolls, the floor and the sparks. */
export const BLOOD_GLOW = new Color("#ff2418").multiplyScalar(1.7);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - x) ** 3;
