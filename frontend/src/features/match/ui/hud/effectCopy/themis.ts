import { MARKS_TO_JUDGE } from "@/game/domain/characters/themis/verdict";
import { ABILITY_TEXT } from "../../abilityText";
import { CARD_TEXT } from "../../cards/cardText";
import type { CopyEntries } from "./types";

/** Themis's verdicts, marks and decrees. */
export const themisCopy = {
  verdict: {
    title: "VEREDITO!",
    tone: "text-amber-300",
    subtitle: ({ verdict }, name) => {
      const thrown = verdict?.cardId
        ? CARD_TEXT[verdict.cardId].name
        : verdict?.ability
          ? ABILITY_TEXT[verdict.ability].name
          : "o ataque";
      const judge = verdict?.judgeName ?? "";
      if (verdict?.defendedName)
        return `${name} já estava marcado: ${thrown} contra ${verdict.defendedName} foi para ${judge} e volta dobrado`;
      return `${judge} julgou ${name}: ${thrown} volta dobrado contra quem mirou`;
    },
  },
  marked: {
    title: "MARCA DA JUSTIÇA!",
    tone: "text-amber-300",
    subtitle: ({ count = 0 }, name) =>
      count === 0
        ? `${name} escapou do julgamento: as marcas se apagaram`
        : count < MARKS_TO_JUDGE
          ? `${name} foi marcado (${count} de ${MARKS_TO_JUDGE})`
          : `${name} tem ${count} marcas: o próximo ataque dele vai a julgamento`,
  },
  marched: {
    title: "JUSTIÇA CEGA!",
    tone: "text-amber-200",
    subtitle: ({ count }) => `Todos andam ${count ?? 0} casas, um depois do outro`,
  },
  decree: {
    title: "DECRETO DE CONTENÇÃO!",
    tone: "text-stone-200",
    subtitle: ({ count }) => `Nas próximas ${count ?? 0} rolagens, o dado dos oponentes não passa de 3`,
  },
  judgment: {
    title: "JULGAMENTO FINAL!",
    tone: "text-amber-300",
    subtitle: ({ count, judgment }, name) =>
      `Dado da Justiça: ${judgment?.die ?? 0} · ${name} avança ${count ?? 0} casas`,
  },
} satisfies CopyEntries;
