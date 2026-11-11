import type { RealmKind, Rift, Tile } from "@/game/domain/types";
import { CARD_TEXT } from "@/features/match/ui/cards/cardText";
import { BLESSING_CAPTION, CURSE_CAPTION } from "./captions";
import { REALM_PALETTES, RIFT_GLOW, THEMES } from "./palettes";
import type { TileTheme } from "./tileTheme";

/** Track tiles share their realm's stone and glow; the effect decides the icon and words. */
export function trackTheme(tile: Tile, realm: RealmKind): TileTheme {
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
    const caption = BLESSING_CAPTION[effect.blessing];
    return { kind: "blessing", ...base, glowIntensity: 0.8, label: "BÊNÇÃO", caption };
  }
  if (effect.kind === "card" && effect.cardId)
    return {
      kind: "card",
      ...base,
      glowIntensity: 0.8,
      label: "DIVINA",
      caption: CARD_TEXT[effect.cardId].name.toUpperCase(),
    };
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

/** A rift of Zarek's Void: its harm under a void-violet glow, ×2 when doubled. */
export function riftTheme(tile: Tile, { back, doubled }: Rift): TileTheme {
  const times = doubled ? " ×2" : "";
  const { effect } = tile;
  if (effect.kind === "trap") {
    const curse = effect.curse ? ` · ${CURSE_CAPTION[effect.curse]}${times}` : "";
    return { kind: "trap", ...THEMES.trap, glow: RIFT_GLOW, label: `VOLTE ${back ?? 0}`, caption: `FENDA${curse}` };
  }
  if (effect.kind === "curse")
    return {
      kind: "curse",
      ...THEMES.curse,
      glow: RIFT_GLOW,
      label: "MALDIÇÃO",
      caption: `${CURSE_CAPTION[effect.curse]}${times}`,
    };
  return {
    kind: "skipTurn",
    ...THEMES.skipTurn,
    glow: RIFT_GLOW,
    label: "PERDE",
    caption: doubled ? "2 VEZES" : "A VEZ",
  };
}
