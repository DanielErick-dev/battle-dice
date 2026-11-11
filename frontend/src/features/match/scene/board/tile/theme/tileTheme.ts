import type { Tile } from "@/game/domain/types";
import { BLESSING_CAPTION, CURSE_CAPTION } from "./captions";
import { REALM_PALETTES, THEMES } from "./palettes";
import { riftTheme, trackTheme } from "./specialThemes";

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
  // Its harm smashed or swallowed by the Void: a harmless wreck for the rest of the game.
  if (destroyed) return { kind: "destroyed", ...THEMES.destroyed, label: "DESTRUÍDA", caption: "" };
  if (tile.rift) return riftTheme(tile, tile.rift);
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
    return {
      kind: "skipTurn",
      ...THEMES.skipTurn,
      label: "PERDE",
      caption: "A VEZ",
    };
  }
  if (effect.kind === "blessing" && effect.blessing === "energy") {
    return {
      kind: "blessing",
      ...THEMES.energy,
      label: "ENERGIA",
      caption: BLESSING_CAPTION.energy,
    };
  }
  if (effect.kind === "blessing" && effect.blessing === "charge") {
    return {
      kind: "blessing",
      ...THEMES.charge,
      label: "HABILIDADE",
      caption: BLESSING_CAPTION.charge,
    };
  }
  if (effect.kind === "blessing") {
    return {
      kind: "blessing",
      ...THEMES.blessing,
      label: "BÊNÇÃO",
      caption: BLESSING_CAPTION[effect.blessing],
    };
  }
  if (effect.kind === "curse") {
    return {
      kind: "curse",
      ...THEMES.curse,
      label: "MALDIÇÃO",
      caption: CURSE_CAPTION[effect.curse],
    };
  }
  if (effect.kind === "card") {
    return { kind: "card", ...THEMES.card, label: "CARTA", caption: "+1 NA MÃO" };
  }
  if (tile.role === "start") return { kind: "start", ...THEMES.start, label: "START", caption: "" };
  if (tile.role === "finish") return { kind: "finish", ...THEMES.finish, label: "FINISH", caption: "" };
  return { kind: "regular", ...THEMES.regular, label: "", caption: "" };
}
