import { useState } from "react";
import type { TileId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import type { PlacementStep } from "../placementText";

interface PlacementPickerProps {
  title: string;
  /** The heading's colour. */
  tone: string;
  steps: readonly PlacementStep[];
  /** Tiles they can go on. */
  tiles: readonly TileId[];
  /** Where the player stands, to show how far each tile is. */
  position: TileId;
  confirmLabel: string;
  onPick: (tiles: TileId[]) => void;
  onCancel: () => void;
}

/**
 * Places an ability's pieces (seals, apparitions) one after the other, each on a tile within
 * reach. The picked tiles show which piece went where; only the player placing them sees this.
 */
export function PlacementPicker({
  title,
  tone,
  steps,
  tiles,
  position,
  confirmLabel,
  onPick,
  onCancel,
}: PlacementPickerProps) {
  const [picked, setPicked] = useState<TileId[]>([]);
  const next = steps[picked.length];
  const done = picked.length === steps.length;
  const ordered = [...tiles].sort((a, b) => a - b);
  const enough = tiles.length >= steps.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm duration-300"
    >
      <div className="flex max-h-full w-full max-w-3xl flex-col items-center gap-5">
        <div className="text-center">
          <h2 id="placement-title" className={cn("text-2xl font-black tracking-wide uppercase", tone)}>
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {!enough
              ? "Não há casas livres suficientes ao alcance."
              : done
                ? "Tudo no lugar. Para os outros, todos parecem iguais."
                : `Escolha a casa: ${next.name} (${next.effect.toLowerCase()}).`}
          </p>
        </div>

        <ol className="flex flex-wrap justify-center gap-2">
          {steps.map((step, index) => (
            <li
              key={step.name}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-black tracking-wider text-white uppercase",
                step.tone,
                index === picked.length ? "ring-2 ring-white" : index > picked.length && "opacity-40",
              )}
            >
              {step.name}
              {picked[index] !== undefined && ` · casa ${picked[index]}`}
            </li>
          ))}
        </ol>

        <ul className="grid min-h-0 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-6 lg:grid-cols-8">
          {ordered.map((tile) => {
            const at = picked.indexOf(tile);
            const distance = tile - position;
            return (
              <li key={tile}>
                <button
                  type="button"
                  disabled={at < 0 && done}
                  onClick={() => at < 0 && setPicked([...picked, tile])}
                  aria-label={`Casa ${tile}`}
                  className={cn(
                    "flex w-full flex-col items-center rounded-xl px-2 py-2 ring-1 transition",
                    at >= 0
                      ? `${steps[at].tone} text-white ring-white/60`
                      : "bg-white/[0.06] text-zinc-200 ring-white/15 hover:bg-white/[0.12] disabled:opacity-30",
                  )}
                >
                  <span className="text-lg leading-none font-black">{tile}</span>
                  <span className="mt-1 max-w-full truncate text-[10px] font-bold tracking-wider uppercase opacity-80">
                    {at >= 0 ? steps[at].name.split(" ").at(-1) : distance > 0 ? `+${distance}` : distance}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-bold tracking-wider text-zinc-300 uppercase transition hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => setPicked(picked.slice(0, -1))}
            disabled={picked.length === 0}
            className="rounded-lg px-4 py-2 text-xs font-bold tracking-wider text-zinc-300 uppercase transition hover:text-white disabled:opacity-30"
          >
            Desfazer
          </button>
          <button
            type="button"
            onClick={() => onPick(picked)}
            disabled={!done}
            className="rounded-lg bg-white/15 px-5 py-2 text-xs font-black tracking-wider text-white uppercase ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
