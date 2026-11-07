import { ABILITY_TEXT } from "../../abilityText";
import { CARD_TEXT } from "../../cards/cardText";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

/** Ability banners carry the ability's own name: charged, or used and what it does now. */
function abilityCopy({ kind, ability }: TileEffectView): Copy {
  const text = ability ? ABILITY_TEXT[ability.id] : null;
  if (kind === "abilityReady") {
    return { title: "HABILIDADE PRONTA!", tone: "text-violet-300", subtitle: () => text?.name ?? "" };
  }
  return {
    title: text ? `${text.name.toUpperCase()}!` : "HABILIDADE!",
    tone: "text-violet-300",
    subtitle: () => text?.active ?? "",
  };
}

/** An ability thrown at an opponent who turned it away: it's spent all the same. */
function abilityBlockedCopy({ blocked }: TileEffectView): Copy {
  const target = blocked?.targetName ?? "";
  const thrown = blocked?.cardId
    ? `A carta ${CARD_TEXT[blocked.cardId].name}`
    : blocked?.ability
      ? ABILITY_TEXT[blocked.ability].name
      : "A habilidade";
  const why =
    blocked?.ward === "untamed"
      ? `${target} está Indomável`
      : blocked?.ward === "susanoo"
        ? `${target} está com o Susanoo ativado`
        : blocked?.ward === "armour"
          ? `${target} está sob a Armadura Espectral`
          : blocked?.ward === "aegis"
            ? `${target} está sob a Égide Celestial`
            : `${target} está fora de alcance`;
  return {
    title: "BLOQUEADO!",
    tone: "text-cyan-200",
    subtitle: () => `Opa, ${why}! ${thrown} foi gasta à toa`,
  };
}

/** Ability banners, and the abilities that need no more than one line. */
export const abilitiesCopy = {
  levitated: {
    title: "FLUTUANDO!",
    tone: "text-rose-300",
    subtitle: ({ from }, name) => `${name} paira sobre a casa ${from}: nada acontece`,
  },
  armour: {
    title: "ARMADURA ESPECTRAL!",
    tone: "text-rose-300",
    subtitle: (_, name) => `Nada atinge ${name}`,
  },
  cleansed: {
    title: "MARÉ PURIFICADORA!",
    tone: "text-blue-300",
    subtitle: ({ count }) => (count ? `A onda limpou ${count} casas do tabuleiro` : "O tabuleiro já estava limpo"),
  },
  trampled: {
    title: "ATROPELADO!",
    tone: "text-sky-300",
    subtitle: ({ count }, name) => `${name} voou ${count ?? 0} casas para trás`,
  },
  timeBent: {
    title: "O TEMPO SE DOBRA!",
    tone: "text-amber-500",
    subtitle: ({ time, count }, name) =>
      time === "halt"
        ? `${name} fica ${count} rodadas sem jogar`
        : `Por ${count} rodadas, o dado de ${name} anda para trás`,
  },
  abilityReady: abilityCopy,
  abilityUsed: abilityCopy,
  abilityBlocked: abilityBlockedCopy,
} satisfies CopyEntries;
