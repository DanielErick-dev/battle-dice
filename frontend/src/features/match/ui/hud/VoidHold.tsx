import { useState } from "react";
import { VOID_CAPACITY, VOID_DOUBLE_ENERGY } from "@/game/domain/characters/zarek/void";
import type { Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { isVoidHarm, voidItemName } from "../voidText";

interface VoidHoldProps {
  player: Player;
  /** It's the player's moment to act. */
  canAct: boolean;
  onRelease: (index: number, doubled: boolean) => void;
}

/**
 * Zarek's Void: what it holds, one slot each. Picking a harm offers to open its rift as it is or
 * doubled (for energy); a spell is set down as it is.
 */
export function VoidHold({ player, canAct, onRelease }: VoidHoldProps) {
  const [open, setOpen] = useState<number | null>(null);
  if (player.ability !== "theVoid") return null;
  const chosen = open !== null ? player.voidHold[open] : undefined;
  const button =
    "rounded-md px-2 py-0.5 text-[10px] font-black tracking-wider uppercase transition disabled:opacity-40";
  const release = (index: number, doubled: boolean) => {
    setOpen(null);
    onRelease(index, doubled);
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-violet-950/40 px-2 py-1 ring-1 ring-violet-400/25">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black tracking-widest text-violet-200 uppercase">
          Vazio {player.voidHold.length}/{VOID_CAPACITY}
        </span>
        <ul className="flex flex-1 flex-wrap gap-1">
          {Array.from({ length: VOID_CAPACITY }, (_, index) => {
            const item = player.voidHold[index];
            return (
              <li key={index}>
                {item ? (
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => setOpen(open === index ? null : index)}
                    title={voidItemName(item)}
                    className={cn(
                      "max-w-28 truncate rounded-md bg-violet-600/70 px-1.5 py-0.5 text-[9px] font-bold text-white transition hover:bg-violet-500 disabled:opacity-50",
                      open === index && "ring-2 ring-white",
                    )}
                  >
                    {voidItemName(item)}
                  </button>
                ) : (
                  <span className="block h-4 w-6 rounded-md border border-dashed border-violet-300/30" />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {chosen && open !== null && canAct && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => release(open, false)} className={cn(button, "bg-violet-500 text-white")}>
            {isVoidHarm(chosen) ? "Abrir fenda" : "Soltar"}
          </button>
          {isVoidHarm(chosen) && (
            <button
              type="button"
              onClick={() => release(open, true)}
              disabled={player.energy < VOID_DOUBLE_ENERGY}
              title={`A penalidade dobra; custa ${VOID_DOUBLE_ENERGY} de energia`}
              className={cn(button, "bg-fuchsia-600 text-white")}
            >
              Dobrar ({VOID_DOUBLE_ENERGY}⚡)
            </button>
          )}
          <button type="button" onClick={() => setOpen(null)} className={cn(button, "text-zinc-300 hover:text-white")}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
