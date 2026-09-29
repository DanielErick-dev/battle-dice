"use client";

import type { ReactNode } from "react";
import type { EffectsQuality } from "@/features/match/config";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";
import { MenuPage } from "./MenuShell";

const QUALITY_OPTIONS: readonly { value: EffectsQuality; label: string; hint: string }[] = [
  { value: "high", label: "Alta", hint: "Brilho, reflexos e bordas suaves" },
  { value: "low", label: "Leve", hint: "Para computadores mais simples" },
];

/** Sound, music and graphics settings, remembered in this browser. */
export function SettingsScreen() {
  const muted = usePreference(preferences.muted);
  const music = usePreference(preferences.music);
  const quality = usePreference(preferences.effectsQuality);

  return (
    <MenuPage title="Configurações" subtitle="Salvas neste navegador.">
      <Group title="Áudio">
        <Toggle
          label="Efeitos sonoros"
          hint="Dado, passos, cartas e casas especiais"
          checked={!muted}
          onChange={(on) => preferences.muted.set(!on)}
        />
        <Toggle
          label="Música e ambiente"
          hint="Trilha e o som do mar"
          checked={music}
          disabled={muted}
          onChange={(on) => preferences.music.set(on)}
        />
      </Group>

      <Group title="Gráficos">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Qualidade dos efeitos</p>
            <p className="text-sm text-zinc-400">Vale na próxima partida.</p>
          </div>
          <div role="radiogroup" aria-label="Qualidade dos efeitos" className="grid grid-cols-2 gap-1 rounded-xl bg-black/40 p-1">
            {QUALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={quality === option.value}
                title={option.hint}
                onClick={() => preferences.effectsQuality.set(option.value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-bold tracking-wider uppercase transition",
                  quality === option.value ? "bg-orange-600 text-white" : "text-zinc-400 hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Group>
    </MenuPage>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">{title}</h2>
      <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.04] ring-1 ring-white/10">{children}</div>
    </section>
  );
}

interface ToggleProps {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, hint, checked, disabled = false, onChange }: ToggleProps) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4 p-4", disabled && "cursor-not-allowed opacity-50")}>
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-sm text-zinc-400">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-orange-600" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
