import { ChevronDown, ScrollText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { playerColor } from "../../characters";
import type { LogEntry } from "../../model/matchView";
import { battleLogLine } from "../battleLogText";

/** Lines kept on screen; the view holds more. */
const SHOWN_LINES = 80;

interface BattleLogProps {
  log: readonly LogEntry[];
  players: readonly Player[];
}

/** What happened so far, in words, so nobody gets lost in the chaos on the board. Follows the latest line. */
export function BattleLog({ log, players }: BattleLogProps) {
  const [open, setOpen] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const lines = useMemo(
    () =>
      log
        .flatMap((entry) => {
          const line = battleLogLine(entry.event, players);
          return line ? [{ id: entry.id, ...line }] : [];
        })
        .slice(-SHOWN_LINES),
    [log, players],
  );

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lines, open]);

  return (
    <section aria-label="Log de batalha" className="hud-panel w-60 p-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase transition-colors hover:bg-white/5 hover:text-zinc-200"
      >
        <ScrollText className="size-3.5" />
        <span className="flex-1 text-left">Log de batalha</span>
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <ol ref={listRef} className="mt-1 flex max-h-56 flex-col gap-0.5 overflow-y-auto px-1 pb-1">
          {lines.length === 0 && <li className="text-[11px] text-zinc-500 italic">Nada aconteceu ainda.</li>}
          {lines.map(({ id, text, actor, divider }) =>
            divider ? (
              <li
                key={id}
                className="mt-1 border-t border-white/10 pt-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
              >
                {text}
              </li>
            ) : (
              <li key={id} className="flex gap-1.5 text-[11px] leading-snug text-zinc-200">
                {actor && (
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: playerColor(actor) }}
                  />
                )}
                <span>{text}</span>
              </li>
            ),
          )}
        </ol>
      )}
    </section>
  );
}
