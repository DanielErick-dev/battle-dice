import { CROWN_BONUS, DIVINE_CHAINS_ROUNDS } from "@/game/domain/characters/seraphiel/seraph";
import type { CopyEntries } from "./types";

/** Seraphiel's fall, crowns and chains. */
export const seraphielCopy = {
  fallen: {
    title: "A QUEDA!",
    tone: "text-red-500",
    subtitle: (_, name) => `${name} pisou no inferno e virou o Anjo Caído, para sempre`,
  },
  crown: {
    title: "COROA!",
    tone: "text-amber-300",
    subtitle: ({ crown }) =>
      `${crown === "infernal" ? "Coroa Infernal" : "Coroa Seráfica"}: +${CROWN_BONUS} casa em toda rolagem até o fim da partida`,
  },
  heavenBarred: {
    title: "O CÉU SE FECHA",
    tone: "text-slate-300",
    subtitle: (_, name) =>
      `${name} caiu: o céu não se abre para ele, e correntes divinas o prendem por ${DIVINE_CHAINS_ROUNDS} rodadas`,
  },
  dragged: {
    title: "ARRASTADO AO INFERNO!",
    tone: "text-red-500",
    subtitle: (_, name) => `${name} foi puxado para o inferno`,
  },
} satisfies CopyEntries;
