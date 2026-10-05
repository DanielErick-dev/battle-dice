import type { TileEffectKind, TileEffectView } from "../../model/matchView";
import {
  CARD_GAMBLE_JACKPOT,
  ENCHANT_ADVANCE,
  FLAME_PUSH,
  PLUNDER_CARDS,
  RUIN_PUSH,
  SOLO_RUIN_ADVANCE,
} from "@/game/domain/abilities";
import { ABILITY_TEXT } from "../abilityText";
import { CARD_TEXT } from "../cards/cardText";
import { BLESSING_DURATION, BLESSING_TEXT } from "../blessingText";

interface EffectBannerProps {
  effect: TileEffectView | null;
  winnerName: string | null;
  nameOf: (playerId: string) => string | null;
}

interface Copy {
  title: string;
  tone: string;
  subtitle: (effect: TileEffectView, name: string) => string;
}

/** Banner copy per effect; a realm gate's depends on the realm (see realmCopy). */
const COPY: Record<
  Exclude<TileEffectKind, "realmEnter" | "abilityReady" | "abilityUsed" | "gamble" | "seal" | "specter" | "enchanted">,
  Copy
> = {
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
  trapBlocked: { title: "BLOQUEADO!", tone: "text-cyan-200", subtitle: blockedSubtitle },
  trapCurse: { title: "MALDIÇÃO!", tone: "text-fuchsia-400", subtitle: curseSubtitle },
  blessing: { title: "BÊNÇÃO!", tone: "text-amber-200", subtitle: blessingSubtitle },
  teleport: { title: "TELETRANSPORTE!", tone: "text-sky-300", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  cleansed: {
    title: "MARÉ PURIFICADORA!",
    tone: "text-blue-300",
    subtitle: ({ count }) => (count ? `A onda limpou ${count} casas do tabuleiro` : "O tabuleiro já estava limpo"),
  },
  frozen: {
    title: "UIVO GLACIAL!",
    tone: "text-sky-200",
    subtitle: ({ count }, name) =>
      count
        ? `${count} oponente${count > 1 ? "s" : ""} congelado${count > 1 ? "s" : ""}: perde a próxima vez`
        : `${name} corre mais neste turno`,
  },
  timeBent: {
    title: "O TEMPO SE DOBRA!",
    tone: "text-amber-500",
    subtitle: ({ time, count }, name) =>
      time === "halt"
        ? `${name} fica ${count} rodadas sem jogar`
        : `Por ${count} rodadas, o dado de ${name} anda para trás`,
  },
  levitated: {
    title: "FLUTUANDO!",
    tone: "text-rose-300",
    subtitle: ({ from }, name) => `${name} paira sobre a casa ${from}: nada acontece`,
  },
  flames: {
    title: "CHAMAS ETERNAS!",
    tone: "text-red-500",
    subtitle: ({ flames }, name) => `${name} perde ${flames?.energyLost ?? 0} de energia e volta ${FLAME_PUSH} casas`,
  },
  armour: {
    title: "ARMADURA ESPECTRAL!",
    tone: "text-rose-300",
    subtitle: (_, name) => `Nada atinge ${name}`,
  },
};

export function EffectBanner({ effect, winnerName, nameOf }: EffectBannerProps) {
  if (winnerName) {
    return (
      <Banner key="winner" persistent title="VITÓRIA!" subtitle={`${winnerName} chegou ao fim`} tone="text-amber-300" />
    );
  }
  if (!effect) return null;

  const copy =
    effect.kind === "realmEnter"
      ? realmCopy(effect)
      : effect.kind === "abilityReady" || effect.kind === "abilityUsed"
        ? abilityCopy(effect)
        : effect.kind === "gamble"
          ? gambleCopy(effect)
          : effect.kind === "seal"
            ? sealCopy(effect)
            : effect.kind === "specter"
              ? specterCopy(effect)
              : effect.kind === "enchanted"
                ? enchantedCopy(effect)
                : COPY[effect.kind];
  return (
    <Banner
      key={`${effect.kind}:${effect.from}:${effect.to}:${effect.playerId}`}
      title={copy.title}
      subtitle={copy.subtitle(effect, nameOf(effect.playerId) ?? "")}
      tone={copy.tone}
    />
  );
}

interface BannerProps {
  title: string;
  subtitle: string;
  tone: string;
  persistent?: boolean;
}

function Banner({ title, subtitle, tone, persistent = false }: BannerProps) {
  return (
    <div
      role="status"
      className={`pointer-events-none flex flex-col items-center ${persistent ? "animate-in zoom-in-75 fade-in duration-500" : "animate-banner"}`}
    >
      <span className={`text-6xl font-black tracking-tight italic drop-shadow-[0_0_25px_currentColor] ${tone}`}>
        {title}
      </span>
      <span className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold tracking-widest text-zinc-100 uppercase backdrop-blur-sm">
        {subtitle}
      </span>
    </div>
  );
}

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

/** Card Gamble's verdict: what the die of fortune showed, and which way it went. */
function gambleCopy({ gamble }: TileEffectView): Copy {
  const value = gamble?.value ?? 0;
  if (value >= CARD_GAMBLE_JACKPOT) {
    return { title: "JACKPOT!", tone: "text-fuchsia-300", subtitle: () => `Tirou ${value}: atrás das cartas épicas!` };
  }
  return gamble?.won
    ? { title: "SORTE GRANDE!", tone: "text-amber-300", subtitle: () => `Tirou ${value}: a sorte sorriu` }
    : { title: "AZAR!", tone: "text-rose-400", subtitle: () => `Tirou ${value}: perdeu uma carta` };
}

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

/** The seal that broke: its name, and what it did (or, alone on the board, what it gave). */
function sealCopy({ seal, playerId }: TileEffectView): Copy {
  const own = seal?.owner === playerId;
  const energy = (amount: number) => (amount > 0 ? `+${amount} de energia` : "Energia já está no máximo");
  switch (seal?.kind) {
    case "tithe":
      return {
        title: "SELO DO DÍZIMO!",
        tone: "text-amber-300",
        subtitle: (_, name) => (own ? "Uma carta a mais na mão" : `${name} entrega a melhor carta`),
      };
    case "ruin":
      return {
        title: "SELO DA RUÍNA!",
        tone: "text-red-500",
        subtitle: (_, name) =>
          own ? `Os selos te levam ${SOLO_RUIN_ADVANCE} casas adiante` : `${name} volta ${RUIN_PUSH} casas`,
      };
    case "silence":
      return {
        title: "SELO DO SILÊNCIO!",
        tone: "text-slate-200",
        subtitle: (_, name) => (own ? energy(seal.energyGained) : `${name} não joga cartas no próximo turno`),
      };
    case "bloodPact":
    default:
      return {
        title: "PACTO DE SANGUE!",
        tone: "text-rose-500",
        subtitle: (_, name) =>
          own ? energy(seal?.energyGained ?? 0) : `${name} perde ${seal?.energyLost ?? 0} de energia para o Escriba`,
      };
  }
}

/** An apparition that struck (or, alone, paid out), or the Warden's apparitions dispelled. */
function specterCopy({ specter, playerId }: TileEffectView): Copy {
  const own = specter?.owner === playerId;
  if (!specter?.kind) {
    return {
      title: "APARIÇÕES DISSIPADAS!",
      tone: "text-sky-200",
      subtitle: (_, name) => `${name} passou pelo Guardião verdadeiro`,
    };
  }
  if (specter.kind === "plunder") {
    return {
      title: "PILHAGEM ESPECTRAL!",
      tone: "text-sky-300",
      subtitle: (_, name) =>
        own ? `+${PLUNDER_CARDS} cartas na mão` : `O Guardião escolhe ${PLUNDER_CARDS} cartas de ${name}`,
    };
  }
  return {
    title: "FOME ESPECTRAL!",
    tone: "text-indigo-300",
    subtitle: (_, name) =>
      own
        ? "Energia cheia"
        : `${name} perdeu ${specter.energyTaken} de energia${specter.chargeGained > 0 ? " · habilidade +1" : ""}`,
  };
}

function blockedSubtitle({ ward }: TileEffectView): string {
  const what = ward?.hidden ? "a armadilha oculta" : "a armadilha";
  if (ward?.kind === "ability") return `A habilidade repeliu ${what}`;
  if (ward?.kind === "halo") return "A Auréola Sagrada te guardou";
  return `O Escudo Arcano segurou ${what}`;
}

function blessingSubtitle({ blessing }: TileEffectView): string {
  if (!blessing) return "";
  if (blessing.kind === "shield") return "O Escudo Arcano te protege";
  if (blessing.kind !== "energy") {
    const { name, effect } = BLESSING_TEXT[blessing.kind];
    return `${name}: ${effect} ${BLESSING_DURATION}`;
  }
  return blessing.energyGained > 0 ? `+${blessing.energyGained} de energia` : "Energia já está no máximo";
}
