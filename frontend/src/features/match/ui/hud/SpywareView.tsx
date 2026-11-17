import { useState } from "react";
import { createPortal } from "react-dom";
import { isAlva } from "@/game/domain/characters/alva/systems";
import type { Player } from "@/game/domain/types";
import { CardView } from "../cards/CardView";
import { CorruptedCard } from "../cards/CorruptedCard";

interface SpywareViewProps {
  /** The viewer: only Unidade Alva gets to look. */
  player: Player;
  players: readonly Player[];
}

/** Unidade Alva sees the hand of every opponent her spyware (Corrupted Cards) sits in: a button each, then the cards. */
export function SpywareView({ player, players }: SpywareViewProps) {
  const [watchedId, setWatchedId] = useState<string | null>(null);
  if (!isAlva(player)) return null;
  const infected = players.filter((other) => other.id !== player.id && other.corrupted > 0);
  const watched = infected.find((other) => other.id === watchedId);
  if (infected.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {infected.map((other) => (
        <button
          key={other.id}
          type="button"
          onClick={() => setWatchedId(other.id)}
          className="rounded-md bg-lime-700/70 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase ring-1 ring-lime-300/40 transition hover:bg-lime-600"
        >
          👁 Ver mão de {other.name}
        </button>
      ))}
      {watched &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setWatchedId(null)}
          >
            <div
              className="flex max-w-3xl flex-col gap-3 rounded-2xl bg-zinc-950/95 p-4 ring-1 ring-lime-400/40"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-center justify-between gap-4">
                <span className="text-sm font-black tracking-widest text-lime-300 uppercase">
                  Mão de {watched.name} ({watched.hand.length})
                </span>
                <button
                  type="button"
                  onClick={() => setWatchedId(null)}
                  className="text-xs font-bold text-zinc-400 uppercase hover:text-white"
                >
                  Fechar
                </button>
              </header>
              <ul className="flex flex-wrap justify-center gap-2">
                {watched.hand.map((card) => (
                  <li key={card.uid} className="w-28 sm:w-32">
                    <CardView cardId={card.cardId} fused={card.fused} />
                  </li>
                ))}
                {Array.from({ length: watched.corrupted }, (_, index) => (
                  <li key={`corrupted${index}`} className="w-28 sm:w-32">
                    <CorruptedCard />
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
