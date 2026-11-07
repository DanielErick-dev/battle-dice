import { ArrowLeft, Maximize, Minimize, Music, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BoardPreset } from "../../boards";
import type { GameAudio } from "../../hooks/useGameAudio";

interface MatchTitleBarProps {
  preset: BoardPreset;
  audio: GameAudio;
  fullscreen: boolean;
  toggleFullscreen: () => void;
}

/** The way back to the menu, the board's name and the sound and screen switches. */
export function MatchTitleBar({ preset, audio, fullscreen, toggleFullscreen }: MatchTitleBarProps) {
  const { muted, toggleMuted, musicOn, toggleMusic } = audio;
  return (
    <div className="hud-panel pointer-events-auto flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Voltar ao menu"
            title="Voltar ao menu"
            className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-lg leading-none font-black tracking-[0.2em] uppercase">
              Battle <span className="text-orange-500">Dice</span>
            </h1>
            <p className="mt-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              {preset.name} · {preset.definition.size} casas
            </p>
          </div>
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
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
