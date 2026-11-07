import { ENCHANT_ADVANCE, WINTER_TILES } from "@/game/domain/characters/fairy/winter";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

/** An enchanted tile stirring: it carries the fairy on, or traps whoever else stopped on it. */
function enchantedCopy({ enchanted, playerId }: TileEffectView): Copy {
  return enchanted?.owner === playerId
    ? {
        title: "CASA ENCANTADA!",
        tone: "text-cyan-200",
        subtitle: (_, name) => `${name} avança ${ENCHANT_ADVANCE} casas`,
      }
    : {
        title: "CASA ENCANTADA!",
        tone: "text-cyan-300",
        subtitle: (_, name) => `${name} fica preso na neve por ${enchanted?.frozen ?? 0} rodadas`,
      };
}

/** The Crystal Fairy's snow and winter. */
export const fairyCopy = {
  snowDrained: {
    title: "PRESO NA NEVE",
    tone: "text-sky-200",
    subtitle: ({ count, drainedBy }, name) =>
      count ? `${name} perde ${count} de energia para ${drainedBy}` : `${name} não tem energia para ${drainedBy} sugar`,
  },
  winter: {
    title: "INVERNO ETERNO!",
    tone: "text-sky-200",
    subtitle: (_, name) =>
      `Não sobrou armadilha para ${name} nevar: o caminho congela ${WINTER_TILES} casas a cada rodada, desde o início`,
  },
  enchanted: enchantedCopy,
} satisfies CopyEntries;
