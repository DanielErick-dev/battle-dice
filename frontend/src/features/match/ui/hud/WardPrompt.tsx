import { ShieldAlert } from "lucide-react";
import type { AbilityId } from "@/game/domain/abilities";
import type { Threat } from "@/game/domain/types";
import { ABILITY_TEXT } from "../abilityText";

interface WardPromptProps {
  ability: AbilityId;
  threat: Threat;
  onAnswer: (use: boolean) => void;
}

const THREAT_TEXT: Readonly<Record<Threat, { title: string; detail: string }>> = {
  trap: { title: "Armadilha!", detail: "Ela vai te jogar para trás." },
  hiddenTrap: { title: "Armadilha oculta!", detail: "Uma armadilha escondida disparou sob seus pés." },
  curse: { title: "Maldição!", detail: "Ela vai tirar energia ou uma carta sua." },
};

/** A trap or curse is about to strike: spend the charged ability to ignore it, or take the hit and keep it. */
export function WardPrompt({ ability, threat, onAnswer }: WardPromptProps) {
  const { title, detail } = THREAT_TEXT[threat];
  const { name } = ABILITY_TEXT[ability];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ward-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/55 p-4 backdrop-blur-[2px] duration-200"
    >
      <div className="hud-panel animate-in zoom-in-90 flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center duration-200">
        <ShieldAlert className="size-10 text-violet-300 drop-shadow-[0_0_14px_rgba(167,139,250,0.8)]" />
        <div>
          <h2 id="ward-title" className="text-2xl font-black tracking-wide text-red-400 uppercase">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-300">{detail}</p>
          <p className="mt-3 text-sm text-zinc-100">
            Usar <span className="font-bold text-violet-200">{name}</span> para anular?
          </p>
          <p className="mt-1 text-xs text-zinc-400">Se usar, ela recarrega do zero. Se não, continua pronta.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAnswer(false)}
            className="h-11 rounded-xl bg-white/10 text-sm font-bold tracking-wider text-zinc-200 uppercase ring-1 ring-white/15 transition hover:bg-white/15"
          >
            Não usar
          </button>
          <button
            type="button"
            onClick={() => onAnswer(true)}
            autoFocus
            className="h-11 rounded-xl bg-violet-600 text-sm font-black tracking-wider text-white uppercase shadow-[0_0_20px_rgba(139,92,246,0.6)] transition hover:bg-violet-500 active:scale-95"
          >
            Usar habilidade
          </button>
        </div>
      </div>
    </div>
  );
}
