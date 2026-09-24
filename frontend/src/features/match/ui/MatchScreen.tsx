"use client";

import { LocateFixed, Map as MapIcon, Music, Volume2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { BOARD_PRESETS, boardPresetFor, DEFAULT_BOARD_ID, isLargeBoard, type BoardPreset } from "../boards";
import { cn } from "@/lib/utils";
import { useMatch } from "../hooks/useMatch";
import { useGameAudio, type GameAudio } from "../hooks/useGameAudio";
import { useMatchAudio } from "../hooks/useMatchAudio";
import { SpriteAnchors } from "../scene/spriteAnchors";
import { BoardPicker } from "./hud/BoardPicker";
import { DicePanel } from "./hud/DicePanel";
import { EffectBanner } from "./hud/EffectBanner";
import { PlayersPanel } from "./hud/PlayersPanel";
import { PlayerSprites } from "./PlayerSprites";

const BoardScene = dynamic(() => import("../scene/BoardScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Carregando arena…</div>,
});

export function MatchScreen() {
  const [boardId, setBoardId] = useState(DEFAULT_BOARD_ID);
  const preset = boardPresetFor(boardId);
  // Lives above the match so music keeps playing (and one AudioContext is kept) across boards.
  const audio = useGameAudio();

  // Remounting on board change gives the new board a fresh match store.
  return <Match key={preset.id} preset={preset} audio={audio} onSelectBoard={setBoardId} />;
}

interface MatchProps {
  preset: BoardPreset;
  audio: GameAudio;
  onSelectBoard: (id: string) => void;
}

function Match({ preset, audio, onSelectBoard }: MatchProps) {
  const { store, view } = useMatch(preset.definition);
  const { sounds, muted, toggleMuted, musicOn, toggleMusic } = audio;
  useMatchAudio(store, sounds);
  const [anchors] = useState(() => new SpriteAnchors());
  const [overview, setOverview] = useState(false);
  const canFollow = isLargeBoard(preset);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05060b] text-white">
      <div className="absolute inset-0">
        <BoardScene
          board={store.board}
          columns={preset.columns}
          view={view}
          anchors={anchors}
          followCamera={canFollow && !overview}
          onDiceImpact={sounds.diceLand}
        />
      </div>
      <PlayerSprites players={view.players} poweredPlayerId={view.poweredPlayerId} anchors={anchors} />

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="hud-panel pointer-events-auto flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg leading-none font-black tracking-[0.2em] uppercase">
                  Battle <span className="text-orange-500">Dice</span>
                </h1>
                <p className="mt-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Partida local</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={toggleMusic}
                  disabled={muted}
                  aria-pressed={musicOn}
                  aria-label={musicOn ? "Desligar música" : "Ligar música"}
                  title={musicOn ? "Desligar música e ambiente" : "Ligar música e ambiente"}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40",
                    musicOn ? "text-zinc-300 hover:text-white" : "text-zinc-600",
                  )}
                >
                  <Music className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleMuted}
                  aria-pressed={muted}
                  aria-label={muted ? "Ligar som" : "Desligar som"}
                  title={muted ? "Ligar som" : "Desligar som"}
                  className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
              </div>
            </div>
            <BoardPicker
              presets={BOARD_PRESETS}
              selectedId={preset.id}
              disabled={view.isAnimating}
              onSelect={onSelectBoard}
            />
          </div>
          <div className="pointer-events-auto max-sm:hidden">
            <PlayersPanel
              players={view.players}
              activePlayerId={view.activePlayerId}
              finishTile={store.board.finishTile}
            />
          </div>
        </header>

        <div className="flex justify-center">
          <EffectBanner effect={view.effect} winnerName={nameOf(view.winnerId)} nameOf={nameOf} />
        </div>

        <footer className="relative flex items-end justify-center">
          {canFollow && (
            <button
              type="button"
              onClick={() => setOverview((current) => !current)}
              className="hud-panel pointer-events-auto absolute bottom-0 left-0 flex items-center gap-2 px-3 py-2.5 text-xs font-bold tracking-wider text-zinc-200 uppercase transition-colors hover:text-white max-sm:bottom-auto max-sm:-top-14"
            >
              {overview ? <LocateFixed className="size-4" /> : <MapIcon className="size-4" />}
              {overview ? "Seguir jogador" : "Ver tabuleiro"}
            </button>
          )}
          <div className="pointer-events-auto w-full max-w-sm">
            <DicePanel
              activePlayerName={nameOf(view.activePlayerId) ?? ""}
              lastRoll={view.lastRoll}
              isRolling={view.isRolling}
              isAnimating={view.isAnimating}
              isFinished={view.winnerId !== null}
              error={view.error}
              onRoll={store.rollDice}
              onRestart={store.restart}
            />
          </div>
        </footer>
      </div>
    </main>
  );
}
