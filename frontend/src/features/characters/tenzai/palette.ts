/** Tenzai's element colours and the easing his effects share. */
import type { Element } from "@/game/domain/types";

export const ELEMENT_COLOR: Readonly<Record<Element, string>> = {
  earth: "#b45309",
  water: "#38bdf8",
  fire: "#f97316",
  wind: "#a7f3d0",
};

export const CONVERGENCE = "#67e8f9";
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
