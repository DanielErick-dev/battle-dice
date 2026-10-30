"use client";

import { Lock, Play, Plus, Sparkles, X, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BOARD_PRESETS } from "@/features/match/boards";
import { MAP_PRESETS } from "@/features/match/maps";
import { CHARACTER_IDS, CHARACTERS, MAX_LOCAL_PLAYERS, parseCharacterList } from "@/features/match/characters";
import { ABILITY_TEXT } from "@/features/match/ui/abilityText";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";
import { LazyCharacterStage as CharacterStage } from "../stage/LazyCharacterStage";
import { MenuPage } from "./MenuShell";

/** Playable characters first; the ones being remade follow, locked. */
const PICKER_ORDER = [...CHARACTER_IDS].sort((a, b) => Number(CHARACTERS[b].playable) - Number(CHARACTERS[a].playable));

/** Before a match: mode, map, local players (repeats allowed) and their characters, test mode; all remembered. */
export function MatchSetupScreen() {
  const boardId = usePreference(preferences.board);
  const mapId = usePreference(preferences.map);
  const seats = parseCharacterList(usePreference(preferences.players));
  const chargedAbilities = usePreference(preferences.chargedAbilities);
  /** The seat the character picker fills. */
  const [picking, setPicking] = useState(0);
  const seat = Math.min(picking, seats.length - 1);
  const characterId = seats[seat];
  const setSeats = (next: readonly string[]) => preferences.players.set(next.join(","));
  const matchHref =
    `/partida?tabuleiro=${encodeURIComponent(boardId)}&mapa=${encodeURIComponent(mapId)}` +
    `&jogadores=${encodeURIComponent(seats.join(","))}` +
    (chargedAbilities ? "&carregadas=1" : "");

  return (
    <MenuPage title="Nova partida" subtitle="Escolha o modo, os jogadores e os personagens." wide>
      {/* On wide screens the stage becomes a tall panel on the left, kept in view; everything else stacks on the right. */}
      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,46rem)] xl:gap-x-0 2xl:grid-cols-[minmax(0,1fr)_minmax(0,60rem)]">
        <section aria-labelledby="mode-title" className="flex flex-col gap-3 xl:col-start-2">
          <h2 id="mode-title" className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
            Modo
          </h2>
          <div role="radiogroup" aria-labelledby="mode-title" className="grid gap-3 sm:grid-cols-2">
            {BOARD_PRESETS.map((preset) => {
              const selected = preset.id === boardId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => preferences.board.set(preset.id)}
                  className={cn(
                    "flex flex-col gap-1 rounded-2xl p-4 text-left ring-1 transition",
                    selected
                      ? "bg-orange-500/15 ring-orange-500/70"
                      : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-black tracking-wide uppercase">{preset.name}</span>
                    <span className="font-mono text-xs text-zinc-400">{preset.definition.size} casas</span>
                  </span>
                  <span className="text-sm text-zinc-300">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="map-title" className="flex flex-col gap-3 xl:col-start-2">
          <h2 id="map-title" className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
            Mapa
          </h2>
          <div role="radiogroup" aria-labelledby="map-title" className="grid gap-3 sm:grid-cols-3">
            {MAP_PRESETS.map((preset) => {
              const selected = preset.id === mapId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => preferences.map.set(preset.id)}
                  className={cn(
                    "flex flex-col gap-1 rounded-2xl p-4 text-left ring-1 transition",
                    selected
                      ? "bg-orange-500/15 ring-orange-500/70"
                      : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]",
                  )}
                >
                  <span className="text-base font-black tracking-wide uppercase">{preset.name}</span>
                  <span className="text-sm text-zinc-300">{preset.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="players-title" className="flex flex-col gap-3 xl:col-start-2">
          <h2 id="players-title" className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
            Jogadores
          </h2>
          <p className="text-sm text-zinc-400">
            Todos jogam nesta tela, um de cada vez. Escolha um jogador e depois o personagem dele.
          </p>
          <div role="radiogroup" aria-labelledby="players-title" className="flex flex-wrap items-center gap-2">
            {seats.map((id, index) => {
              const character = CHARACTERS[id];
              const selected = index === seat;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center rounded-xl ring-1 transition",
                    selected ? "bg-white/10 ring-2 ring-amber-300/80" : "bg-white/[0.04] ring-white/10",
                  )}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPicking(index)}
                    className="flex items-center gap-2 py-2 pr-2 pl-3 text-left"
                  >
                    <ColorDot color={character.color} />
                    <span className="text-xs font-black tracking-widest text-zinc-400">J{index + 1}</span>
                    <span className="text-sm font-bold tracking-wide uppercase">{character.name}</span>
                  </button>
                  {seats.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remover jogador ${index + 1}`}
                      title="Remover jogador"
                      onClick={() => {
                        setSeats(seats.filter((_, other) => other !== index));
                        if (index <= seat) setPicking(Math.max(0, seat - 1));
                      }}
                      className="mr-1 grid size-7 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {seats.length < MAX_LOCAL_PLAYERS && (
              <button
                type="button"
                onClick={() => {
                  setSeats([...seats, characterId]);
                  setPicking(seats.length);
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold tracking-wide text-zinc-300 uppercase ring-1 ring-white/10 hover:bg-white/[0.08] hover:text-white"
              >
                <Plus className="size-4" /> Jogador
              </button>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={chargedAbilities}
            onClick={() => preferences.chargedAbilities.set(!chargedAbilities)}
            className="flex w-fit items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 ring-white/10 hover:bg-white/[0.06]"
          >
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                chargedAbilities ? "bg-amber-400" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                  chargedAbilities ? "left-[1.125rem]" : "left-0.5",
                )}
              />
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <Zap className="size-3.5 text-amber-300" /> Habilidades carregadas
              </span>
              <span className="text-xs text-zinc-400">Modo teste: todos começam com a habilidade pronta.</span>
            </span>
          </button>
        </section>

        <section aria-labelledby="character-title" className="flex flex-col gap-3 xl:contents">
          <h2
            id="character-title"
            className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase xl:col-start-2"
          >
            {seats.length > 1 ? `Personagem do jogador ${seat + 1}` : "Personagem"}
          </h2>
          {/* The stage stays in view at the top while the character list scrolls past it. */}
          <div className="grid items-start gap-4 md:grid-cols-[18rem_1fr] xl:contents">
            {/* At most 80% of its column, at its left (the canvas bleeds a fifth of its width past each side, short of the
              cards), and always 5:6, as the camera frames by height: a narrow box would crop the figure. Kept 15dvh down
              while scrolling, room for the canvas's top bleed (a fifth of at most 72dvh), so tall scenery isn't cut. */}
            <CharacterStage
              characterId={characterId}
              className="mx-auto h-72 w-64 md:sticky md:top-8 md:h-96 md:w-72 xl:col-start-1 xl:row-span-6 xl:row-start-1 xl:top-[15dvh] xl:mx-0 xl:mt-16 xl:aspect-[5/6] xl:h-auto xl:w-[min(80%,calc(72dvh*5/6))] xl:self-start xl:justify-self-start"
            />
            <div
              role="radiogroup"
              aria-labelledby="character-title"
              className="grid gap-3 sm:grid-cols-2 xl:col-start-2"
            >
              {PICKER_ORDER.map((id) => {
                const character = CHARACTERS[id];
                const ability = ABILITY_TEXT[character.ability];
                const selected = id === characterId;
                const locked = !character.playable;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={locked}
                    title={locked ? "Em breve: personagem sendo refeito" : undefined}
                    onClick={() => setSeats(seats.map((other, index) => (index === seat ? id : other)))}
                    className={cn(
                      "flex flex-col gap-1 rounded-2xl p-4 text-left ring-1 transition",
                      selected
                        ? "bg-white/10 ring-2 ring-amber-300/80"
                        : "bg-white/[0.04] ring-white/10 hover:bg-white/[0.08]",
                      locked && "cursor-not-allowed opacity-40 grayscale hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ColorDot color={character.color} />
                      <span className="text-base font-black tracking-wider uppercase">{character.name}</span>
                      {locked && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
                          <Lock className="size-3" /> Em breve
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-zinc-400">{character.epithet}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-violet-300 uppercase">
                      <Sparkles className="size-3.5" />
                      {ability.name}
                    </span>
                    <span className="text-xs text-zinc-300">{ability.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex justify-end xl:col-start-2">
          <Link
            href={matchHref}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-10 text-lg font-black tracking-wider uppercase shadow-[0_10px_40px_rgba(234,88,12,0.45)] transition hover:bg-orange-500 active:scale-[0.98] sm:w-auto"
          >
            <Play className="size-5 fill-current" />
            Começar partida
          </Link>
        </div>
      </div>
    </MenuPage>
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
    />
  );
}
