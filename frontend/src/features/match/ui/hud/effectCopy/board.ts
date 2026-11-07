import { CARD_TEXT } from "../../cards/cardText";
import { BLESSING_TEXT, blessingDuration } from "../../blessingText";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

function curseSubtitle({ curse }: TileEffectView): string {
  if (!curse) return "";
  if (curse.kind === "discard") {
    return curse.card ? `Perdeu a carta ${CARD_TEXT[curse.card.cardId].name}` : "Mão vazia: nada a perder";
  }
  return curse.energyLost > 0 ? `-${curse.energyLost} de energia` : "Sem energia para perder";
}

/** The realm banner depends on which realm opened. */
function realmCopy(effect: TileEffectView): Copy {
  return effect.realm === "celestial"
    ? {
        title: "TRILHA CELESTIAL!",
        tone: "text-amber-100",
        subtitle: () => "Os céus se abrem: só bênçãos pelo caminho",
      }
    : {
        title: "TRILHA INFERNAL!",
        tone: "text-orange-500",
        subtitle: () => "Só maldições entre as chamas. Boa sorte.",
      };
}

function blockedSubtitle({ ward }: TileEffectView): string {
  const what = ward?.hidden ? "a armadilha oculta" : "a armadilha";
  if (ward?.kind === "ability") return `A habilidade repeliu ${what}`;
  if (ward?.kind === "halo") return "A Auréola Sagrada te guardou";
  if (ward?.kind === "untamed") return "Indomável: nada o detém";
  if (ward?.kind === "susanoo") return "O Susanoo a protege";
  if (ward?.kind === "fallen") return "O inferno não fere o Anjo Caído";
  return `O Escudo Arcano segurou ${what}`;
}

function blessingSubtitle({ blessing }: TileEffectView): string {
  if (!blessing) return "";
  if (blessing.kind === "shield") return "O Escudo Arcano te protege";
  if (blessing.kind === "charge")
    return blessing.charged ? "+1 de carga na habilidade" : "A habilidade já está carregada";
  if (blessing.kind !== "energy") {
    const { name, effect } = BLESSING_TEXT[blessing.kind];
    return `${name}: ${effect} ${blessingDuration(blessing.turns)}`;
  }
  return blessing.energyGained > 0 ? `+${blessing.energyGained} de energia` : "Energia já está no máximo";
}

/** The board's own tiles and turn notices, for everyone. */
export const boardCopy = {
  portal: { title: "PORTAL!", tone: "text-purple-300", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  trap: { title: "ARMADILHA!", tone: "text-red-400", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  hiddenTrap: {
    title: "ARMADILHA OCULTA!",
    tone: "text-red-500",
    subtitle: ({ from, to }) => `Casa ${from} → ${to} · ela mudou de lugar`,
  },
  advance: { title: "AVANCE!", tone: "text-cyan-300", subtitle: ({ from, to }) => `+${to - from} casas até a ${to}` },
  extraTurn: { title: "JOGUE DE NOVO!", tone: "text-lime-300", subtitle: (_, name) => `${name} ganhou outra rolagem` },
  skipTurn: {
    title: "PERDE A VEZ!",
    tone: "text-slate-200",
    subtitle: (_, name) => `${name} fica fora da próxima rodada`,
  },
  turnSkipped: { title: "VEZ PULADA", tone: "text-slate-300", subtitle: (_, name) => `${name} descansa esta rodada` },
  teleport: { title: "TELETRANSPORTE!", tone: "text-sky-300", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  timedOut: {
    title: "TEMPO ESGOTADO!",
    tone: "text-red-300",
    subtitle: (_, name) => `A ampulheta acabou: ${name} perdeu a vez`,
  },
  trapBlocked: { title: "BLOQUEADO!", tone: "text-cyan-200", subtitle: blockedSubtitle },
  trapCurse: { title: "MALDIÇÃO!", tone: "text-fuchsia-400", subtitle: curseSubtitle },
  blessing: { title: "BÊNÇÃO!", tone: "text-amber-200", subtitle: blessingSubtitle },
  realmEnter: realmCopy,
} satisfies CopyEntries;
