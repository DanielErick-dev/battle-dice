import { CONTAINED_DIE } from "@/game/domain/characters/themis/cards";
import { INNER_FLAME_MAX } from "@/game/domain/characters/akane/fire";
import { Layers, Sparkles } from "lucide-react";
import { abilityCycle, isAbilityReady } from "@/game/domain/abilities/charge";
import { getTile, trackOf } from "@/game/domain/board/board";
import { MAX_ENERGY } from "@/game/domain/core/energy";
import type { Board, Player, PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { playerColor } from "@/features/characters";
import { ABILITY_TEXT } from "../abilityText";
import { BlessingBadges } from "./BlessingBadges";
import { EnergyOrbs, useShownEnergy } from "../cards/EnergyMeter";
import { inHeaven } from "@/game/domain/board/blessings";

interface PlayersPanelProps {
  players: readonly Player[];
  activePlayerId: PlayerId;
  board: Board;
}

const REALM_NAMES = { infernal: "Inferno", celestial: "Céu" } as const;
const REALM_TONES = { infernal: "text-orange-400", celestial: "text-amber-200" } as const;

/**
 * Everyone in the match, two short lines each: who they are and where, then their energy, cards
 * and ability charge, over a sliver of progress. Compact so four players fit beside the board;
 * only worth showing with opponents.
 */
export function PlayersPanel({ players, activePlayerId, board }: PlayersPanelProps) {
  const { finishTile } = board;
  return (
    <section aria-label="Jogadores" className="hud-panel w-60 p-1.5">
      <ul className="flex flex-col gap-1">
        {players.map((player, seat) => {
          const isActive = player.id === activePlayerId;
          const track = getTile(board, player.position).track;
          const trackLength = trackOf(board, player.position)?.tiles.length ?? 0;
          // On a track, progress stays at its portal until the player comes out.
          const progress = (((track?.portal ?? player.position) - 1) / (finishTile - 1)) * 100;
          const color = playerColor(player.id);
          const ready = isAbilityReady(player);
          // The Silent Verdict's charge is hers to know: the others only see it on her own turn.
          const secret = player.ability === "silentVerdict" && !isActive;

          return (
            <li
              key={player.id}
              className={cn(
                "rounded-lg px-2 py-1.5 transition-colors",
                isActive ? "bg-white/10 ring-1 ring-white/15" : "bg-transparent",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                />
                {/* The seat, which tells apart players of the same character when the names are cut short. */}
                <span className="text-[10px] font-black text-zinc-500">J{seat + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-100" title={player.name}>
                  {player.name}
                </span>
                {player.skipTurns > 0 && (
                  <span className="rounded-full bg-slate-200/15 px-1.5 text-[9px] font-bold text-slate-200 uppercase">
                    Perde a vez{player.skipTurns > 1 && ` ×${player.skipTurns}`}
                  </span>
                )}
                {player.reversedRolls > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-300 uppercase">
                    Tempo invertido
                    {player.reversedRolls > 1 && ` ×${player.reversedRolls}`}
                  </span>
                )}
                {player.justiceMarks > 0 && (
                  <span
                    title="Marca da Justiça: o próximo ataque dele pode ir para o Veredito da Têmis"
                    className="rounded-full bg-amber-400/20 px-1.5 text-[9px] font-bold text-amber-200 uppercase"
                  >
                    ⚖ Marcado{player.justiceMarks > 1 && ` ×${player.justiceMarks}`}
                  </span>
                )}
                {player.burning > 0 && (
                  <span
                    title="Pegando fogo: o dado anda a metade (para baixo) e não ganha energia"
                    className="rounded-full bg-orange-500/25 px-1.5 text-[9px] font-bold text-orange-300 uppercase"
                  >
                    🔥 Queimando ×{player.burning}
                  </span>
                )}
                {player.innerFlame > 0 && (
                  <span
                    title={`Chama Interna: com ${INNER_FLAME_MAX}, a próxima rolagem libera o Ímpeto Brilhante`}
                    className="rounded-full bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-200 uppercase"
                  >
                    Chama {player.innerFlame}/{INNER_FLAME_MAX}
                  </span>
                )}
                {player.impetusRolls > 0 && (
                  <span
                    title="Ímpeto Brilhante: rolagens com bônus, queimando quem estiver no caminho"
                    className="rounded-full bg-yellow-400/25 px-1.5 text-[9px] font-bold text-yellow-200 uppercase"
                  >
                    Ímpeto ×{player.impetusRolls}
                  </span>
                )}
                {player.containedRolls > 0 && (
                  <span
                    title={`Decreto de Contenção: o dado não passa de ${CONTAINED_DIE}`}
                    className="rounded-full bg-stone-400/20 px-1.5 text-[9px] font-bold text-stone-200 uppercase"
                  >
                    Dado ≤{CONTAINED_DIE} ×{player.containedRolls}
                  </span>
                )}
                {track ? (
                  <span className={cn("text-[10px] font-bold whitespace-nowrap", REALM_TONES[track.realm])}>
                    {REALM_NAMES[track.realm]} {track.index + 1}/{trackLength}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-zinc-400">
                    {player.position}/{finishTile}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2.5 pl-3.5">
                <MiniEnergy energy={player.energy} />
                <span
                  className="flex items-center gap-0.5 text-[10px] font-semibold text-zinc-400"
                  title="Cartas na mão"
                >
                  <Layers className="size-3" />
                  {player.hand.length}
                </span>
                {player.ability && (
                  <span
                    className="ml-auto flex items-center gap-1"
                    title={`${ABILITY_TEXT[player.ability].name}: ${ABILITY_TEXT[player.ability].description}`}
                  >
                    <Sparkles className={cn("size-3", ready && !secret ? "text-violet-200" : "text-zinc-500")} />
                    {secret ? (
                      <span className="text-[10px] font-black text-zinc-500" title="Carga secreta">
                        ?
                      </span>
                    ) : ready ? (
                      <span className="text-[9px] font-black tracking-wider text-violet-200 uppercase">Pronta</span>
                    ) : (
                      <span className="flex gap-0.5">
                        {Array.from({ length: abilityCycle(player.ability) }, (_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-1.5 rounded-full",
                              i < player.abilityCharge ? "bg-violet-300" : "bg-white/15",
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {player.blessings.length > 0 && (
                <div className="mt-1 pl-3.5">
                  <BlessingBadges player={player} waiting={inHeaven(board, player.position)} compact />
                </div>
              )}
              <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/10">
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

/** A player's energy in miniature, filling up one orb at a time like the hand's EnergyMeter. */
function MiniEnergy({ energy }: { energy: number }) {
  const shown = useShownEnergy(energy);
  return (
    <span title={`Energia: ${energy} de ${MAX_ENERGY}`}>
      <EnergyOrbs shown={shown} className="gap-0.5" orbClassName="size-1.5" />
    </span>
  );
}
