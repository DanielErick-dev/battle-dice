import type { Tile } from "@/game/domain/types";

export type TileKind =
  | "regular"
  | "start"
  | "finish"
  | "portal"
  | "trap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "card";

export interface TileTheme {
  kind: TileKind;
  base: string;
  top: string;
  glow: string;
  glowIntensity: number;
  label: string;
  /** Second line under the label, e.g. the destination tile. */
  caption: string;
}

const THEMES = {
  regular: { base: "#1a1c28", top: "#2a2d3d", glow: "#000000", glowIntensity: 0 },
  start: { base: "#0c2a20", top: "#146049", glow: "#10b981", glowIntensity: 0.35 },
  finish: { base: "#33240a", top: "#7a5a12", glow: "#fbbf24", glowIntensity: 0.6 },
  portal: { base: "#1c0f33", top: "#2c1454", glow: "#a855f7", glowIntensity: 0.8 },
  trap: { base: "#2a0d10", top: "#4a151b", glow: "#ef4444", glowIntensity: 0.6 },
  advance: { base: "#062a30", top: "#0b4750", glow: "#22d3ee", glowIntensity: 0.6 },
  extraTurn: { base: "#16290a", top: "#2d4d12", glow: "#a3e635", glowIntensity: 0.6 },
  skipTurn: { base: "#1a1f2b", top: "#343c4f", glow: "#cbd5e1", glowIntensity: 0.45 },
  card: { base: "#2a0a2e", top: "#4a1450", glow: "#f472b6", glowIntensity: 0.65 },
} as const;

export function themeFor(tile: Tile): TileTheme {
  const { effect } = tile;
  if (effect.kind === "portal") {
    return { kind: "portal", ...THEMES.portal, label: "PORTAL", caption: `IR PARA ${effect.to}` };
  }
  if (effect.kind === "trap") {
    return { kind: "trap", ...THEMES.trap, label: `VOLTE ${tile.id - effect.to}`, caption: `→ ${effect.to}` };
  }
  if (effect.kind === "advance") {
    return { kind: "advance", ...THEMES.advance, label: `AVANCE ${effect.to - tile.id}`, caption: `→ ${effect.to}` };
  }
  if (effect.kind === "extraTurn") {
    return { kind: "extraTurn", ...THEMES.extraTurn, label: "JOGUE", caption: "DE NOVO" };
  }
  if (effect.kind === "skipTurn") {
    return { kind: "skipTurn", ...THEMES.skipTurn, label: "PERDE", caption: "A VEZ" };
  }
  if (effect.kind === "card") {
    return { kind: "card", ...THEMES.card, label: "CARTA", caption: "+1 NA MÃO" };
  }
  if (tile.role === "start") return { kind: "start", ...THEMES.start, label: "START", caption: "" };
  if (tile.role === "finish") return { kind: "finish", ...THEMES.finish, label: "FINISH", caption: "" };
  return { kind: "regular", ...THEMES.regular, label: "", caption: "" };
}

/** Energy colour along the path: green at the start, through blue and violet, to gold at the finish. */
const PATH_STOPS: readonly [number, [number, number, number]][] = [
  [0, [16, 185, 129]],
  [0.35, [56, 189, 248]],
  [0.7, [168, 85, 247]],
  [1, [251, 191, 36]],
];

export function pathColor(progress: number): string {
  const t = Math.min(1, Math.max(0, progress));
  const upper = PATH_STOPS.findIndex(([stop]) => stop >= t);
  const [endAt, end] = PATH_STOPS[Math.max(upper, 1)];
  const [startAt, start] = PATH_STOPS[Math.max(upper, 1) - 1];
  const k = (t - startAt) / (endAt - startAt || 1);
  const channel = (i: number) => Math.round(start[i] + (end[i] - start[i]) * k);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}
