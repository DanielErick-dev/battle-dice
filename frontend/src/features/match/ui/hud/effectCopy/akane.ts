import { EMBER_SLIDE, HOT_BLOOD_REACH } from "@/game/domain/characters/akane/cards";
import {
  BURN_ROUNDS,
  IMPETUS_BONUS,
  IMPETUS_PUSH,
  INNER_FLAME_MAX,
  SCARLET_ROUNDS,
} from "@/game/domain/characters/akane/fire";
import type { CopyEntries } from "./types";

/** Akane's scarlet fire. */
export const akaneCopy = {
  scarletLit: {
    title: "ZONA DE INCÊNDIO!",
    tone: "text-orange-400",
    subtitle: ({ count }) => `${count ?? 0} casas em chamas por ${SCARLET_ROUNDS} rodadas`,
  },
  ignited: {
    title: "PEGANDO FOGO!",
    tone: "text-orange-400",
    subtitle: ({ count }, name) => `${name} queima por ${count ?? BURN_ROUNDS} rodadas: dado pela metade, sem energia`,
  },
  quenched: {
    title: "FOGO APAGADO!",
    tone: "text-sky-300",
    subtitle: ({ count }, name) =>
      count && count > 1 ? `${count} jogadores não queimam mais` : `${name} não queima mais`,
  },
  kindled: {
    title: "CHAMA INTERNA!",
    tone: "text-orange-300",
    subtitle: ({ count }, name) =>
      (count ?? 0) >= INNER_FLAME_MAX
        ? `${name} está pronto: a próxima rolagem libera o Ímpeto`
        : `${name} tem ${count ?? 0} de ${INNER_FLAME_MAX} chamas`,
  },
  impetus: {
    title: "ÍMPETO BRILHANTE!",
    tone: "text-amber-300",
    subtitle: ({ count }) =>
      `+${IMPETUS_BONUS} casas nas próximas ${count ?? 0} rolagens; quem estiver no caminho queima e volta ${IMPETUS_PUSH}`,
  },
  emberSlid: {
    title: "PASSO DE BRASA!",
    tone: "text-orange-300",
    subtitle: (_, name) => `${name} desliza pelas chamas: +${EMBER_SLIDE} casas`,
  },
  emberStep: {
    title: "PASSO DE BRASA!",
    tone: "text-orange-300",
    subtitle: () => `Se parar no fogo nesta rolagem, desliza +${EMBER_SLIDE} casas`,
  },
  hotBlood: {
    title: "SANGUE QUENTE!",
    tone: "text-red-400",
    subtitle: ({ count }) => `Quem estava a até ${HOT_BLOOD_REACH} casas volta ${count ?? 0}`,
  },
  fuel: {
    title: "COMBUSTÍVEL PURO!",
    tone: "text-amber-300",
    subtitle: ({ count }) => `Nas próximas ${count ?? 0} rolagens, 2 dados se algum oponente estiver pegando fogo`,
  },
  burntRoll: {
    title: "PEGANDO FOGO!",
    tone: "text-orange-400",
    subtitle: ({ count }, name) =>
      count
        ? `${name} queima: o dado cai pela metade, anda ${count}`
        : `${name} queima: o dado cai pela metade e não sai do lugar`,
  },
  fireFed: {
    title: "O FOGO COBRA!",
    tone: "text-orange-300",
    subtitle: ({ count }, name) =>
      count
        ? `${name} queima: 1 de energia vai para o Akane`
        : `${name} queima, sem energia: o Akane ganha 1 mesmo assim`,
  },
  supernova: {
    title: "SUPERNOVA ESCARLATE!",
    tone: "text-orange-300",
    subtitle: ({ count }, name) => `Todo o fogo volta para ${name}: avança ${count ?? 0} casas`,
  },
} satisfies CopyEntries;
