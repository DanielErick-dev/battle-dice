import { getTile, trackOf } from "@/game/domain/board";
import type { Board, Player, PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { playerColor } from "../../characters";
import { EnergyMeter } from "../cards/EnergyMeter";
import { AbilityMeter } from "./AbilityMeter";

interface PlayersPanelProps {
  players: readonly Player[];
  activePlayerId: PlayerId;
  board: Board;
}

const REALM_NAMES = { infernal: "Inferno", celestial: "Céu" } as const;
const REALM_TONES = { infernal: "text-orange-400", celestial: "text-amber-200" } as const;

/** Everyone in the match and how far along they are; only worth showing with opponents. */
export function PlayersPanel({ players, activePlayerId, board }: PlayersPanelProps) {
  const { finishTile } = board;
  return (
    <section className="hud-panel w-64 p-3">
      <h2 className="mb-2 px-1 text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Jogadores</h2>
      <ul className="flex flex-col gap-1.5">
        {players.map((player) => {
          const isActive = player.id === activePlayerId;
          const track = getTile(board, player.position).track;
          const trackLength = trackOf(board, player.position)?.tiles.length ?? 0;
          // On a track, progress stays at its portal until the player comes out.
          const progress = (((track?.portal ?? player.position) - 1) / (finishTile - 1)) * 100;
          const color = playerColor(player.id);

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
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100" title={player.name}>
                  {player.name}
                </span>
                {player.skipTurns > 0 && (
                  <span className="rounded-full bg-slate-200/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-200 uppercase">
                    Perde a vez
                  </span>
                )}
                <span className="text-[10px] font-semibold whitespace-nowrap text-zinc-500">
                  {player.hand.length} {player.hand.length === 1 ? "carta" : "cartas"}
                </span>
                {track ? (
                  <span className={cn("text-[10px] font-bold whitespace-nowrap", REALM_TONES[track.realm])}>
                    {REALM_NAMES[track.realm]} {track.index + 1}/{trackLength}
                  </span>
                ) : (
                  <span className="font-mono text-xs text-zinc-400">
                    {player.position}/{finishTile}
                  </span>
                )}
              </div>
              <div className="mt-1.5">
                <EnergyMeter energy={player.energy} />
              </div>
              <div className="mt-1">
                <AbilityMeter player={player} />
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

