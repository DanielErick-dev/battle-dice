import { TRAP_DRAIN_ENERGY } from "@/game/domain/landing";
import { BLESSING_ENERGY } from "@/game/domain/realms";
import type { RealmKind, Tile, TrapCurse } from "@/game/domain/types";

export type TileKind =
  | "regular"
  | "start"
  | "finish"
  | "portal"
  | "trap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "card"
  | "curse"
  | "blessing"
  | "trapZone"
  | "destroyed";

export interface TileTheme {
  kind: TileKind;
  base: string;
  top: string;
  glow: string;
  glowIntensity: number;
  label: string;
  /** Second line under the label, e.g. the destination tile. */
  caption: string;
  /** Medallion text instead of the tile number (track tiles show their step). */
  badge?: string;
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
  trapZone: { base: "#1c1216", top: "#2b1d24", glow: "#7f1d1d", glowIntensity: 0.15 },
  destroyed: { base: "#0c0a10", top: "#19151f", glow: "#8b5cf6", glowIntensity: 0.3 },
} as const;

/** Realm palettes: portal glow, and the stone of every tile on the realm's track. */
export const REALM_PALETTES: Readonly<Record<RealmKind, { base: string; top: string; glow: string; name: string }>> = {
  infernal: { base: "#1a0604", top: "#2b0b06", glow: "#ff5a1f", name: "INFERNAL" },
  celestial: { base: "#1a2446", top: "#2c3b6e", glow: "#ffd87a", name: "CELESTIAL" },
};

const CURSE_CAPTION: Readonly<Record<TrapCurse, string>> = {
  discard: "-1 CARTA",
  drain: `-${TRAP_DRAIN_ENERGY} ENERGIA`,
};

/**
 * How a tile looks. Tiles of a trap zone all share one uneasy look, so the zone shows but
 * not which of its tiles hide the traps.
 */
export function themeFor(
  tile: Tile,
  { inTrapZone = false, destroyed = false }: { inTrapZone?: boolean; destroyed?: boolean } = {},
): TileTheme {
  const { effect } = tile;
  if (tile.track) return trackTheme(tile, tile.track.realm);
  // Its trap smashed by the Trap Ward: a harmless wreck for the rest of the game.
  if (destroyed) return { kind: "destroyed", ...THEMES.destroyed, label: "DESTRUÍDA", caption: "" };
  if (inTrapZone) return { kind: "trapZone", ...THEMES.trapZone, label: "", caption: "" };
  if (effect.kind === "portal") {
    if (effect.realm) {
      const realm = REALM_PALETTES[effect.realm];
      return {
        kind: "portal",
        ...THEMES.portal,
        glow: realm.glow,
        glowIntensity: 0.9,
        label: "PORTAL",
        caption: `TRILHA ${realm.name}`,
      };
    }
    return { kind: "portal", ...THEMES.portal, label: "PORTAL", caption: `IR PARA ${effect.to}` };
  }
  if (effect.kind === "trap") {
    const curse = effect.curse ? ` · ${CURSE_CAPTION[effect.curse]}` : "";
    return { kind: "trap", ...THEMES.trap, label: `VOLTE ${tile.id - effect.to}`, caption: `→ ${effect.to}${curse}` };
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

/** Track tiles share their realm's stone and glow; the effect decides the icon and words. */
function trackTheme(tile: Tile, realm: RealmKind): TileTheme {
  const palette = REALM_PALETTES[realm];
  const base = {
    base: palette.base,
    top: palette.top,
    glow: palette.glow,
    glowIntensity: 0.55,
    badge: String((tile.track?.index ?? 0) + 1),
  };
  const { effect } = tile;
  if (effect.kind === "curse")
    return { kind: "curse", ...base, glowIntensity: 0.8, label: "MALDIÇÃO", caption: CURSE_CAPTION[effect.curse] };
  if (effect.kind === "blessing") {
    const caption = effect.blessing === "shield" ? "ESCUDO" : `+${BLESSING_ENERGY} ENERGIA`;
    return { kind: "blessing", ...base, glowIntensity: 0.8, label: "BÊNÇÃO", caption };
  }
  if (effect.kind === "card") return { kind: "card", ...base, label: "CARTA", caption: "+1 NA MÃO" };
  if (effect.kind === "extraTurn") return { kind: "extraTurn", ...base, label: "JOGUE", caption: "DE NOVO" };
  if (effect.kind === "skipTurn")
    return { kind: "skipTurn", ...base, glowIntensity: 0.8, label: "PERDE", caption: "A VEZ" };
  if (effect.kind === "trap") {
    const curse = effect.curse ? ` · ${CURSE_CAPTION[effect.curse]}` : "";
    return {
      kind: "trap",
      ...base,
      glowIntensity: 0.8,
      label: `VOLTE ${tile.id - effect.to}`,
      caption: `NA TRILHA${curse}`,
    };
  }
  if (effect.kind === "advance")
    return { kind: "advance", ...base, label: `AVANCE ${effect.to - tile.id}`, caption: "NA TRILHA" };
  return { kind: "regular", ...base, label: "", caption: "" };
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
