import { CONDENSER_CARDS, CONDENSER_RECOVERIES } from "@/game/domain/characters/alchemist/condenser";
import type { InvertedOutcome } from "@/game/domain/characters/alchemist/types";
import type { CopyEntries } from "./types";

/** What a turned tile did, for the banner's subtitle ("amount" is tiles, turns or energy). */
const OUTCOME: Readonly<Record<InvertedOutcome, (amount: number) => string>> = {
  advance: (amount) => `a armadilha empurra para a frente: +${amount} casas`,
  pushBack: (amount) => `o avanço vira recuo: ${amount} casas para trás`,
  extraTurns: (amount) => `o perde a vez vira ${amount === 1 ? "uma jogada extra" : `${amount} jogadas extras`}`,
  loseTurn: () => "o jogue de novo vira perde a vez",
  draw: () => "a maldição vira uma carta comprada",
  discard: () => "o presente vira uma carta perdida",
  energy: (amount) => `a maldição vira +${amount} de energia`,
  drain: () => "a bênção vira energia drenada",
  heaven: () => "o portão do inferno abre para o céu",
  hell: () => "o portão do céu abre para o inferno",
  resisted: () => "protegido: a casa não faz nada",
};

/** The Alchemist's Inversion, her Condenser and the Magnum Opus. */
export const alchemistCopy = {
  inversion: {
    title: "GRANDE INVERSÃO ALQUÍMICA!",
    tone: "text-emerald-300",
    subtitle: ({ count }) => `Por ${count ?? 0} rodadas, casas boas ferem os oponentes e as ruins a favorecem`,
  },
  tileInverted: ({ inverted = "resisted" }) => ({
    title: "CASA INVERTIDA!",
    tone: inverted === "resisted" ? "text-zinc-300" : "text-emerald-300",
    subtitle: ({ count }, name) => `${name}: ${OUTCOME[inverted](count ?? 0)}`,
  }),
  graveyardOpened: {
    title: "CEMITÉRIO ABERTO",
    tone: "text-emerald-200",
    subtitle: ({ count }, name) =>
      `${name} escolhe ${count ?? 0} ${count === 1 ? "carta" : "cartas"} para trazer de volta`,
  },
  magnumOpus: {
    title: "A GRANDE OBRA!",
    tone: "text-red-300",
    subtitle: ({ count }) => `A Pedra Filosofal consome tudo: ${count ?? 0} oponentes perdem a melhor carta`,
  },
} satisfies CopyEntries;

/** The Alchemist's Condenser chip: how full it is and how many picks are left, or that they're all spent. */
export function condenserLabel(state: { condensed: number; recoveries: number }): string {
  const left = CONDENSER_RECOVERIES - state.recoveries;
  if (left <= 0) return "Condensador esgotado";
  return `Condensador ${Math.min(state.condensed, CONDENSER_CARDS)}/${CONDENSER_CARDS} · ${left}×`;
}
