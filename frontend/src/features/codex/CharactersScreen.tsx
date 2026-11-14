"use client";

import { useState } from "react";
import { abilityCycle } from "@/game/domain/abilities/charge";
import { isPassive } from "@/game/domain/abilities/ability";
import { CARD_CATALOG } from "@/game/domain/cards/catalog";
import { CHARACTER_IDS, CHARACTERS, type CharacterId } from "@/features/characters";
import { CHARACTER_GUIDES } from "@/features/characters/guide";
import { CardView } from "@/features/match/ui/cards/CardView";
import { ABILITY_TEXT } from "@/features/shared/text/abilityText";
import { cn } from "@/lib/utils";
import { LazyCharacterStage as CharacterStage } from "@/features/menu/stage/LazyCharacterStage";
import { MenuPage } from "@/features/menu/ui/MenuShell";

type Tab = "style" | "ability" | "cards" | "tips";

const TABS: readonly { id: Tab; label: string }[] = [
  { id: "style", label: "Estilo" },
  { id: "ability", label: "Habilidade" },
  { id: "cards", label: "Cartas" },
  { id: "tips", label: "Dicas" },
];

/** Every character up close: their stage, how they play, their ability, their own cards and tips. */
export function CharactersScreen({ initial }: { initial?: string }) {
  const [selected, setSelected] = useState<CharacterId>(
    CHARACTER_IDS.includes(initial as CharacterId) ? (initial as CharacterId) : "zephyr",
  );
  const [tab, setTab] = useState<Tab>("style");
  const character = CHARACTERS[selected];
  const guide = CHARACTER_GUIDES[selected];
  const ability = ABILITY_TEXT[character.ability];
  const ownCards = Object.values(CARD_CATALOG).filter((card) => card.exclusive === character.ability);

  return (
    <MenuPage title="Personagens" subtitle="Conheça cada um antes de escolher." wide>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)_minmax(0,32rem)]">
        <ul
          aria-label="Personagens"
          className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[72dvh] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pr-1 lg:pb-0"
        >
          {CHARACTER_IDS.map((id) => (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(id)}
                aria-pressed={id === selected}
                className={cn(
                  "flex w-44 items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition lg:w-full",
                  id === selected ? "bg-white/12 ring-white/30" : "bg-white/[0.03] ring-white/5 hover:bg-white/[0.07]",
                )}
              >
                <span
                  aria-hidden
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ background: CHARACTERS[id].color, opacity: id === selected ? 1 : 0.5 }}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black tracking-wide">{CHARACTERS[id].name}</span>
                  <span className="block truncate text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                    {CHARACTER_GUIDES[id].role}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center">
          <CharacterStage characterId={selected} className="h-80 w-72 sm:h-[28rem] sm:w-96" />
          <p className="relative z-10 mt-2 text-2xl font-black tracking-[0.2em] uppercase">{character.name}</p>
          <p className="relative z-10 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
            {character.epithet}
          </p>
          <p
            className="relative z-10 mt-1 text-[11px] font-bold tracking-wider uppercase"
            style={{ color: character.color }}
          >
            {guide.role}
          </p>
        </div>

        <section aria-label={`Sobre ${character.name}`} className="hud-panel flex flex-col gap-4 self-start p-5">
          <div role="tablist" className="grid grid-cols-4 gap-1 rounded-xl bg-black/30 p-1">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-lg py-1.5 text-[11px] font-black tracking-wider uppercase transition",
                  tab === id ? "bg-white/15 text-white" : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "style" && <p className="text-sm leading-relaxed text-zinc-200">{guide.style}</p>}

          {tab === "ability" && (
            <div className="flex flex-col gap-2">
              <p className="text-base font-black tracking-wide text-violet-200 uppercase">{ability.name}</p>
              <p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
                {isPassive(character.ability) ? "Passiva" : `Carga ${abilityCycle(character.ability)} turnos`}
              </p>
              <p className="text-sm leading-relaxed text-zinc-200">{ability.description}</p>
            </div>
          )}

          {tab === "cards" &&
            (ownCards.length === 0 ? (
              <p className="text-sm text-zinc-400">Ainda sem cartas exclusivas.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4">
                {ownCards.map((card) => (
                  <li key={card.id} className="flex flex-col gap-1.5">
                    <CardView cardId={card.id} expanded />
                  </li>
                ))}
              </ul>
            ))}

          {tab === "tips" && (
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-zinc-200">
              {guide.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </MenuPage>
  );
}
