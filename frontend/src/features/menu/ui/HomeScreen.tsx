"use client";

import { Layers, Lock, Play, Settings, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CHARACTERS, parseCharacterList } from "@/features/match/characters";
import { ABILITY_TEXT } from "@/features/match/ui/abilityText";
import { preferences, usePreference } from "@/features/settings/preferences";
import { MenuBackdrop } from "./MenuShell";

const CharacterStage = dynamic(() => import("./CharacterStage").then((module) => module.CharacterStage), {
  ssr: false,
});

/** Parts of the game still to come, shown so the menu hints at where it's going. */
const COMING_SOON: readonly { label: string; icon: LucideIcon }[] = [
  { label: "Personagens", icon: Users },
  { label: "Cartas", icon: Layers },
  { label: "Loja", icon: ShoppingBag },
];

/** Main menu: start a match, open the settings, and a peek at the chosen character. */
export function HomeScreen() {
  const [characterId] = parseCharacterList(usePreference(preferences.players));
  const character = CHARACTERS[characterId];

  return (
    <main className="relative flex min-h-dvh w-full items-center overflow-hidden bg-[#05060b] text-white">
      <MenuBackdrop />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-10 md:grid-cols-[1fr_auto]">
        <section className="flex flex-col gap-8">
          <div>
            <p className="text-xs font-bold tracking-[0.4em] text-amber-300/80 uppercase">Tabuleiro arcano</p>
            <h1 className="mt-3 text-5xl leading-none font-black tracking-[0.12em] uppercase drop-shadow-[0_0_30px_rgba(249,115,22,0.35)] sm:text-7xl">
              Battle <span className="text-orange-500">Dice</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-zinc-300 sm:text-base">
              Role os dados, use suas cartas na hora certa e fuja das armadilhas até o fim do caminho.
            </p>
          </div>

          <nav aria-label="Menu principal" className="flex w-full max-w-sm flex-col gap-3">
            <Link
              href="/jogar"
              className="group flex h-14 items-center justify-center gap-3 rounded-2xl bg-orange-600 text-lg font-black tracking-wider uppercase shadow-[0_10px_40px_rgba(234,88,12,0.45)] transition hover:bg-orange-500 active:scale-[0.98]"
            >
              <Play className="size-5 fill-current transition-transform group-hover:scale-110" />
              Jogar
            </Link>
            <Link
              href="/configuracoes"
              className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-white/5 text-sm font-bold tracking-wider text-zinc-200 uppercase ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            >
              <Settings className="size-4" />
              Configurações
            </Link>

            <ul className="mt-2 grid grid-cols-3 gap-2">
              {COMING_SOON.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  title="Em breve"
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.03] px-2 py-3 text-zinc-500 ring-1 ring-white/5"
                >
                  <Icon className="size-4" />
                  <span className="text-[11px] font-bold tracking-wider uppercase">{label}</span>
                  <span className="flex items-center gap-1 text-[9px] font-semibold tracking-widest uppercase">
                    <Lock className="size-2.5" /> Em breve
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <aside aria-label="Personagem escolhido" className="relative flex flex-col items-center justify-self-center">
          <CharacterStage characterId={characterId} className="h-80 w-72 sm:h-96 sm:w-80" />
          <p className="mt-2 text-center text-2xl font-black tracking-[0.2em] uppercase">{character.name}</p>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">{character.epithet}</p>
          <p className="mt-1 text-xs font-bold tracking-wider text-violet-300 uppercase">
            {ABILITY_TEXT[character.ability].name}
          </p>
          <Link
            href="/jogar"
            className="mt-2 text-xs font-bold tracking-wider text-amber-300/90 uppercase hover:text-amber-200"
          >
            Trocar personagem
          </Link>
        </aside>
      </div>
    </main>
  );
}
