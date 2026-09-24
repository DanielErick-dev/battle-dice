"use client";

import { Volume2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { BOARD_PRESETS, boardPresetFor, DEFAULT_BOARD_ID, type BoardPreset } from "../boards";
import { useMatch } from "../hooks/useMatch";
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

  // Remounting on board change gives the new board a fresh match store.
  return <Match key={preset.id} preset={preset} onSelectBoard={setBoardId} />;
}

interface MatchProps {
  preset: BoardPreset;
  onSelectBoard: (id: string) => void;
}

function Match({ preset, onSelectBoard }: MatchProps) {
  const { store, view } = useMatch(preset.definition);
  const { muted, toggleMuted } = useMatchAudio(store);
  const [anchors] = useState(() => new SpriteAnchors());
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05060b] text-white">
      <div className="absolute inset-0">
        <BoardScene board={store.board} columns={preset.columns} view={view} anchors={anchors} />
      </div>
      <PlayerSprites players={view.players} anchors={anchors} />

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
          <EffectBanner effect={view.effect} winnerName={nameOf(view.winnerId)} />
        </div>

        <footer className="flex items-end justify-center">
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
