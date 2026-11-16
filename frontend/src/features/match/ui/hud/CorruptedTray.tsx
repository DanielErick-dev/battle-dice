import { useState } from "react";
import { isBlackedOut } from "@/game/domain/characters/alva/systems";
import type { Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { cardText } from "../cards/cardText";

interface CorruptedTrayProps {
  player: Player;
  /** It's the player's moment to act. */
  canAct: boolean;
  onPurge: (cardUid: string) => void;
}

/** Unidade Alva's spyware in the player's hand: deleting one means picking a real card to sacrifice with it. */
export function CorruptedTray({ player, canAct, onPurge }: CorruptedTrayProps) {
  const [picking, setPicking] = useState(false);
  if (player.corrupted === 0) return null;
  const locked = player.silencedTurns > 0 || isBlackedOut(player);
  const purge = (cardUid: string) => {
    setPicking(false);
    onPurge(cardUid);
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-lime-950/50 px-2 py-1 ring-1 ring-lime-400/30">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black tracking-widest text-lime-300 uppercase">
          Corrompidas ×{player.corrupted}
        </span>
        <span className="flex-1 text-[9px] text-lime-200/70">a Unidade Alva vê sua mão</span>
        <button
          type="button"
          disabled={!canAct || locked || player.hand.length === 0}
          onClick={() => setPicking((open) => !open)}
          title={locked ? "Travado: não dá para apagar agora" : "Apagar 1 sacrificando uma carta sua"}
          className="rounded-md bg-lime-600/70 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase transition hover:bg-lime-500 disabled:opacity-40"
        >
          Apagar 1
        </button>
      </div>
      {picking && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-lime-100">Qual carta vai junto?</span>
          <ul className="flex flex-wrap gap-1">
            {player.hand.map((card) => (
              <li key={card.uid}>
                <button
                  type="button"
                  onClick={() => purge(card.uid)}
                  className={cn(
                    "max-w-32 truncate rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-100 ring-1 ring-lime-400/30 transition hover:bg-zinc-700",
                  )}
                >
                  {cardText(card.cardId, card.fused).name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
