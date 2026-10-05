import type { ReactNode } from "react";
import type { Player, PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { playerColor } from "../../characters";

interface TargetPickerProps {
  title: string;
  /** Tailwind text colour of the title. */
  tone: string;
  subtitle: string;
  /** The opponents to pick from, each with their seat (0 first) for the "J1" tag. */
  targets?: readonly { player: Player; seat: number }[];
  /** What to show at the end of an opponent's row (cards in hand, position…). */
  detail?: (player: Player) => ReactNode;
  /** Why an opponent can't be picked, or undefined when they can. */
  unavailable?: (player: Player) => string | undefined;
  /** Choices that aren't an opponent (Arrow Rain's traps ahead, a power to pick), listed first. */
  alternatives?: readonly { label: string; detail: string; onPick: () => void }[];
  onPick?: (targetId: PlayerId) => void;
  onCancel: () => void;
}

/** Picks what an ability is aimed at, or how it's used: one button per opponent (with their seat) or choice. */
export function TargetPicker({
  title,
  tone,
  subtitle,
  targets = [],
  detail,
  unavailable,
  alternatives = [],
  onPick,
  onCancel,
}: TargetPickerProps) {
  const row =
    "flex w-full items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]">
      <section aria-label={title} className="hud-panel flex w-full max-w-sm flex-col gap-3 p-5">
        <div>
          <h2 className={cn("text-lg font-black tracking-wider uppercase", tone)}>{title}</h2>
          <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {alternatives.map((alternative) => (
            <li key={alternative.label}>
              <button type="button" onClick={alternative.onPick} className={row}>
                <span className="text-sm font-bold">{alternative.label}</span>
                <span className="min-w-0 flex-1 text-right text-xs font-semibold text-zinc-300">
                  {alternative.detail}
                </span>
              </button>
            </li>
          ))}
          {targets.map(({ player, seat }) => {
            const color = playerColor(player.id);
            const reason = unavailable?.(player);
            return (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={reason !== undefined}
                  title={reason}
                  onClick={() => onPick?.(player.id)}
                  className={row}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-xs font-black text-zinc-500">J{seat + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{player.name}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-zinc-300">
                    {detail?.(player)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onCancel}
          className="self-end rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider text-zinc-400 uppercase hover:bg-white/10 hover:text-white"
        >
          Cancelar
        </button>
      </section>
    </div>
  );
}
