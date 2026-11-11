import type { RealmKind } from "@/game/domain/types";

export const THEMES = {
  regular: {
    base: "#1a1c28",
    top: "#2a2d3d",
    glow: "#000000",
    glowIntensity: 0,
  },
  start: {
    base: "#0c2a20",
    top: "#146049",
    glow: "#10b981",
    glowIntensity: 0.35,
  },
  finish: {
    base: "#33240a",
    top: "#7a5a12",
    glow: "#fbbf24",
    glowIntensity: 0.6,
  },
  portal: {
    base: "#1c0f33",
    top: "#2c1454",
    glow: "#a855f7",
    glowIntensity: 0.8,
  },
  trap: {
    base: "#2a0d10",
    top: "#4a151b",
    glow: "#ef4444",
    glowIntensity: 0.6,
  },
  advance: {
    base: "#062a30",
    top: "#0b4750",
    glow: "#22d3ee",
    glowIntensity: 0.6,
  },
  extraTurn: {
    base: "#16290a",
    top: "#2d4d12",
    glow: "#a3e635",
    glowIntensity: 0.6,
  },
  skipTurn: {
    base: "#1a1f2b",
    top: "#343c4f",
    glow: "#cbd5e1",
    glowIntensity: 0.45,
  },
  card: {
    base: "#2a0a2e",
    top: "#4a1450",
    glow: "#f472b6",
    glowIntensity: 0.65,
  },
  blessing: {
    base: "#2a2408",
    top: "#4d4110",
    glow: "#facc15",
    glowIntensity: 0.7,
  },
  /** Energy tiles: plain tiles that happen to give energy, in the energy orbs' yellow. */
  energy: {
    base: "#3a3008",
    top: "#6b5810",
    glow: "#fde047",
    glowIntensity: 0.75,
  },
  /** Ability charge tiles: electric indigo, apart from the portals' purple and the advances' cyan. */
  charge: {
    base: "#13143d",
    top: "#232a7a",
    glow: "#818cf8",
    glowIntensity: 0.8,
  },
  curse: {
    base: "#1e0b24",
    top: "#36123f",
    glow: "#c026d3",
    glowIntensity: 0.6,
  },
  trapZone: {
    base: "#1c1216",
    top: "#2b1d24",
    glow: "#7f1d1d",
    glowIntensity: 0.15,
  },
  destroyed: {
    base: "#0c0a10",
    top: "#19151f",
    glow: "#8b5cf6",
    glowIntensity: 0.3,
  },
} as const;

/** Realm palettes: portal glow, and the stone of every tile on the realm's track. */
export const REALM_PALETTES: Readonly<Record<RealmKind, { base: string; top: string; glow: string; name: string }>> = {
  infernal: { base: "#1a0604", top: "#2b0b06", glow: "#ff5a1f", name: "INFERNAL" },
  celestial: { base: "#1a2446", top: "#2c3b6e", glow: "#ffd87a", name: "CELESTIAL" },
};

export const RIFT_GLOW = "#a78bfa";
