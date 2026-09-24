import type { Player, PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { skinFor } from "../../config";

interface PlayersPanelProps {
  players: readonly Player[];
  activePlayerId: PlayerId;
  finishTile: number;
}

export function PlayersPanel({ players, activePlayerId, finishTile }: PlayersPanelProps) {
  return (
    <section className="hud-panel w-56 p-3">
      <h2 className="mb-2 px-1 text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Jogadores</h2>
      <ul className="flex flex-col gap-1.5">
        {players.map((player) => {
          const isActive = player.id === activePlayerId;
          const progress = ((player.position - 1) / (finishTile - 1)) * 100;
          const { color } = skinFor(player.id);

          return (
            <li
              key={player.id}
              className={cn(
                "rounded-xl px-3 py-2 transition-colors",
                isActive ? "bg-white/10 ring-1 ring-white/15" : "bg-transparent",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
                <span className="flex-1 text-sm font-bold text-zinc-100">{player.name}</span>
                <span className="font-mono text-xs text-zinc-400">
                  {player.position}/{finishTile}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
