import { BREEZE_THRESHOLD, COMBUSTION_PUSH, CONVERGENCE_BONUS } from "@/game/domain/characters/tenzai/elements";
import type { Element } from "@/game/domain/types";
import type { CopyEntries } from "./types";

export const ELEMENT_NAME: Readonly<Record<Element, string>> = {
  earth: "Terra",
  water: "Água",
  fire: "Fogo",
  wind: "Vento",
};

const ELEMENT_TONE: Readonly<Record<Element, string>> = {
  earth: "text-amber-500",
  water: "text-sky-300",
  fire: "text-orange-400",
  wind: "text-emerald-200",
};

const BENDING_TITLE: Readonly<Record<Element, string>> = {
  earth: "MURALHA TECTÔNICA!",
  water: "LAÇO DE CORRENTEZA!",
  fire: "DADO DE COMBUSTÃO!",
  wind: "SEQUESTRO DE BRISA!",
};

/** Tenzai's four elements. */
export const tenzaiCopy = {
  elementBent: ({ element = "earth" }) => ({
    title: BENDING_TITLE[element],
    tone: ELEMENT_TONE[element],
    subtitle: (_, name) => `${name} dobra a ${ELEMENT_NAME[element]}`,
  }),
  attuned: ({ element = "earth" }) => ({
    title: "DESPERTAR PRIMORDIAL",
    tone: ELEMENT_TONE[element],
    subtitle: ({ count }) => `${ELEMENT_NAME[element]} entra na órbita: ${count ?? 0} de 4 elementos`,
  }),
  convergence: {
    title: "CONVERGÊNCIA!",
    tone: "text-cyan-200",
    subtitle: ({ count }, name) =>
      `${name} fica intocável por ${count ?? 0} rodadas, com +${CONVERGENCE_BONUS} no dado e a habilidade pronta`,
  },
  wallRaised: {
    title: "MURALHA TECTÔNICA!",
    tone: "text-amber-500",
    subtitle: ({ count }) => `Ninguém passa até ela levar ${count ?? 0} de dano`,
  },
  wallStrengthened: {
    title: "FORTIFICAÇÃO TECTÔNICA!",
    tone: "text-amber-400",
    subtitle: ({ count }) => `A muralha agora aguenta ${count ?? 0}`,
  },
  wallHit: {
    title: "BATEU NA MURALHA!",
    tone: "text-amber-500",
    subtitle: ({ count }, name) =>
      count ? `${name} para atrás dela; restam ${count} de vida` : `${name} derrubou a muralha, mas para atrás dela`,
  },
  wallCrumbled: {
    title: "MURALHA CAIU!",
    tone: "text-stone-300",
    subtitle: () => "O caminho está livre",
  },
  tetherBound: {
    title: "LAÇO DE CORRENTEZA!",
    tone: "text-sky-300",
    subtitle: ({ count }, name) => `${name} arrasta o Tenzai junto por ${count ?? 0} rodadas`,
  },
  tetherPulled: {
    title: "PUXADO PELA MARÉ!",
    tone: "text-sky-300",
    subtitle: ({ count }, name) => `${name} vem junto: +${count ?? 0} casas`,
  },
  tetherSwapped: {
    title: "CHICOTE DE RESSACA!",
    tone: "text-sky-400",
    subtitle: () => "Trocaram de lugar",
  },
  combustionReady: {
    title: "DADO DE COMBUSTÃO!",
    tone: "text-orange-400",
    subtitle: ({ count }) => `Tirando 5 ou 6, o dado vale ×${count ?? 2} e explode`,
  },
  combustion: {
    title: "EXPLOSÃO!",
    tone: "text-orange-500",
    subtitle: ({ count }) =>
      count
        ? `${count} ${count > 1 ? "voltam" : "volta"} ${COMBUSTION_PUSH}+ casas, e ele rola de novo`
        : "Rola de novo!",
  },
  breezeArmed: {
    title: "SEQUESTRO DE BRISA",
    tone: "text-emerald-200",
    subtitle: () => `Escondido: rouba a próxima rolagem de ${BREEZE_THRESHOLD}+ de um oponente`,
  },
  breezeStolen: {
    title: "SEQUESTRO DE BRISA!",
    tone: "text-emerald-200",
    subtitle: ({ count }, name) => `${name} fica parado; o vento leva as ${count ?? 0} casas para o Tenzai`,
  },
  breezeResisted: {
    title: "A BRISA ESCORREGOU",
    tone: "text-emerald-200",
    subtitle: (_, name) => `${name} estava protegido; a armadilha continua armada`,
  },
} satisfies CopyEntries;
