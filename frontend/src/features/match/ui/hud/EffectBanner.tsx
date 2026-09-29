import type { TileEffectKind, TileEffectView } from "../../model/matchView";
import { ABILITY_TEXT } from "../abilityText";
import { CARD_TEXT } from "../cards/cardText";

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
const COPY: Record<Exclude<TileEffectKind, "realmEnter" | "abilityReady" | "abilityUsed">, Copy> = {
  portal: { title: "PORTAL!", tone: "text-purple-300", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  trap: { title: "ARMADILHA!", tone: "text-red-400", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
  hiddenTrap: {
    title: "ARMADILHA OCULTA!",
    tone: "text-red-500",
    subtitle: ({ from, to }) => `Casa ${from} → ${to} · ela mudou de lugar`,
  },
  advance: { title: "AVANCE!", tone: "text-cyan-300", subtitle: ({ from, to }) => `+${to - from} casas até a ${to}` },
  extraTurn: { title: "JOGUE DE NOVO!", tone: "text-lime-300", subtitle: (_, name) => `${name} ganhou outra rolagem` },
  skipTurn: { title: "PERDE A VEZ!", tone: "text-slate-200", subtitle: (_, name) => `${name} fica fora da próxima rodada` },
  turnSkipped: { title: "VEZ PULADA", tone: "text-slate-300", subtitle: (_, name) => `${name} descansa esta rodada` },
  trapBlocked: { title: "BLOQUEADO!", tone: "text-cyan-200", subtitle: blockedSubtitle },
  trapCurse: { title: "MALDIÇÃO!", tone: "text-fuchsia-400", subtitle: curseSubtitle },
  blessing: { title: "BÊNÇÃO!", tone: "text-amber-200", subtitle: blessingSubtitle },
  teleport: { title: "TELETRANSPORTE!", tone: "text-sky-300", subtitle: ({ from, to }) => `Casa ${from} → ${to}` },
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
    ? { title: "TRILHA CELESTIAL!", tone: "text-amber-100", subtitle: () => "Os céus se abrem: só bênçãos pelo caminho" }
    : { title: "TRILHA INFERNAL!", tone: "text-orange-500", subtitle: () => "Só maldições entre as chamas. Boa sorte." };
}

/** Ability banners carry the ability's own name: charged, or used and what it does now. */
function abilityCopy({ kind, ability }: TileEffectView): Copy {
  const text = ability ? ABILITY_TEXT[ability.id] : null;
  if (kind === "abilityReady") {
    return { title: "HABILIDADE PRONTA!", tone: "text-violet-300", subtitle: () => text?.name ?? "" };
  }
  return { title: text ? `${text.name.toUpperCase()}!` : "HABILIDADE!", tone: "text-violet-300", subtitle: () => text?.active ?? "" };
}

function blockedSubtitle({ ward }: TileEffectView): string {
  const what = ward?.hidden ? "a armadilha oculta" : "a armadilha";
  if (ward?.kind === "ability") return `A habilidade repeliu ${what}`;
  return `O Escudo Arcano segurou ${what}`;
}

function blessingSubtitle({ blessing }: TileEffectView): string {
  if (!blessing) return "";
  if (blessing.kind === "shield") return "O Escudo Arcano te protege";
  return blessing.energyGained > 0 ? `+${blessing.energyGained} de energia` : "Energia já está no máximo";
}
