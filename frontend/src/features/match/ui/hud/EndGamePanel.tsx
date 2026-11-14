"use client";

import { useEffect, useState } from "react";
import { awardsOf, type AwardId, type MatchStats, type PlayerStats } from "@/game/domain/stats/matchStats";
import type { Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";

/** The winner's banner gets the stage to itself for a moment first. */
const SHOW_AFTER_MS = 2600;

const AWARD_COPY: Readonly<Record<AwardId, { title: string; icon: string; caption: (value: number) => string }>> = {
  unlucky: { title: "Azarado", icon: "🪤", caption: (n) => `caiu em ${n} ${n === 1 ? "armadilha" : "armadilhas"}` },
  thief: { title: "Mão Leve", icon: "🃏", caption: (n) => `roubou ${n} ${n === 1 ? "carta" : "cartas"}` },
  punchingBag: { title: "Saco de Pancada", icon: "🥊", caption: (n) => `foi empurrado ${n} casas` },
  cardShark: { title: "Mestre das Cartas", icon: "🎴", caption: (n) => `jogou ${n} ${n === 1 ? "carta" : "cartas"}` },
  highRoller: { title: "Dado de Ouro", icon: "🎲", caption: (n) => `andou ${n} casas numa rolagem` },
  marathon: { title: "Maratonista", icon: "🏃", caption: (n) => `andou ${n} casas no total` },
  wall: { title: "Intocável", icon: "🛡️", caption: (n) => `barrou ${n} ${n === 1 ? "ataque" : "ataques"}` },
  powerful: { title: "Poderoso", icon: "✨", caption: (n) => `usou a habilidade ${n} ${n === 1 ? "vez" : "vezes"}` },
};

const COLUMNS: readonly { key: keyof PlayerStats; label: string }[] = [
  { key: "rolls", label: "Rolagens" },
  { key: "tilesWalked", label: "Casas" },
  { key: "trapsHit", label: "Armadilhas" },
  { key: "tilesPushedBack", label: "Empurrado" },
  { key: "cardsPlayed", label: "Cartas" },
  { key: "cardsStolen", label: "Roubos" },
  { key: "abilitiesUsed", label: "Habilidade" },
  { key: "turnsLost", label: "Vezes perdidas" },
];

interface EndGamePanelProps {
  stats: MatchStats;
  players: readonly Player[];
  winnerId: string;
  colorOf: (playerId: string) => string;
  onRestart?: () => void;
  onReplay?: () => void;
}

/** After a win: the match's awards and everyone's numbers, then play again (or watch it again). */
export function EndGamePanel({ stats, players, winnerId, colorOf, onRestart, onReplay }: EndGamePanelProps) {
  const [shown, setShown] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!shown || hidden) return null;
  const nameOf = (id: string) => players.find((player) => player.id === id)?.name ?? id;
  const awards = awardsOf(stats);

  return (
    <div className="animate-in fade-in pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-500">
      <section
        aria-label="Fim de partida"
        className="hud-panel hud-scroll flex max-h-[90dvh] w-full max-w-3xl flex-col gap-5 overflow-y-auto p-6"
      >
        <header className="text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">Fim de partida</p>
          <h2 className="mt-1 text-3xl font-black tracking-wider text-amber-300 uppercase">
            {nameOf(winnerId)} venceu!
          </h2>
        </header>

        {awards.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {awards.map((award) => {
              const copy = AWARD_COPY[award.id];
              return (
                <li
                  key={award.id}
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.04] px-2 py-3 text-center ring-1 ring-white/10"
                >
                  <span className="text-2xl" aria-hidden>
                    {copy.icon}
                  </span>
                  <span className="text-[11px] font-black tracking-wider text-amber-200 uppercase">{copy.title}</span>
                  <span className="text-sm font-bold" style={{ color: colorOf(award.playerId) }}>
                    {nameOf(award.playerId)}
                  </span>
                  <span className="text-[11px] text-zinc-400">{copy.caption(award.value)}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-[10px] tracking-wider text-zinc-400 uppercase">
                <th className="py-1 text-left font-bold">Jogador</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="px-1 py-1 text-right font-bold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.id}
                  className={cn("border-t border-white/5", player.id === winnerId && "bg-amber-300/5")}
                >
                  <td className="py-1.5 font-bold" style={{ color: colorOf(player.id) }}>
                    {player.id === winnerId ? "👑 " : ""}
                    {player.name}
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="px-1 py-1.5 text-right font-mono text-zinc-200">
                      {stats[player.id]?.[column.key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setHidden(true)} className={SECONDARY}>
            Ver o tabuleiro
          </button>
          {onReplay && (
            <button type="button" onClick={onReplay} className={SECONDARY}>
              Assistir replay
            </button>
          )}
          {onRestart && (
            <button type="button" onClick={onRestart} className={PRIMARY}>
              Jogar de novo
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

const SECONDARY =
  "rounded-xl bg-white/5 px-4 py-2 text-xs font-black tracking-wider text-zinc-200 uppercase ring-1 ring-white/10 transition hover:bg-white/10";
const PRIMARY =
  "rounded-xl bg-orange-600 px-4 py-2 text-xs font-black tracking-wider text-white uppercase transition hover:bg-orange-500";
