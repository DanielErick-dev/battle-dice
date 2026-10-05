import type { TileId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import type { PlacementStep } from "../placementText";

interface TilePickingProps {
  title: string;
  /** Tailwind text colour of the title. */
  tone: string;
  steps: readonly PlacementStep[];
  /** Tiles picked so far, one per step in order. */
  picked: readonly TileId[];
  /** There are fewer tiles to pick from than steps. */
  short: boolean;
  confirmLabel: string;
  onUndo: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Picking tiles for an ability right on the board: a bar at the top says what to pick next (the
 * tiles that can take it breathe on the board, and a click picks one); once every step has its
 * tile, a dialog asks to confirm them.
 */
export function TilePicking({
  title,
  tone,
  steps,
  picked,
  short,
  confirmLabel,
  onUndo,
  onCancel,
  onConfirm,
}: TilePickingProps) {
  const next = steps[picked.length];
  const done = picked.length === steps.length;
  const button = "rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition disabled:opacity-30";

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center px-4 sm:top-6">
        <section
          aria-label={title}
          className="hud-panel pointer-events-auto flex max-w-xl flex-col items-center gap-2 px-4 py-3"
        >
          <h2 className={cn("text-base font-black tracking-wide uppercase", tone)}>{title}</h2>
          <p className="text-center text-xs text-zinc-300">
            {short
              ? "Não há casas livres suficientes."
              : next
                ? `Clique numa casa brilhando no tabuleiro: ${next.name} (${next.effect.toLowerCase()}).`
                : "Tudo escolhido."}
          </p>
          <ol className="flex flex-wrap justify-center gap-1.5">
            {steps.map((step, index) => (
              <li
                key={step.name}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase",
                  step.tone,
                  index === picked.length ? "ring-2 ring-white" : index > picked.length && "opacity-40",
                )}
              >
                {step.name}
                {picked[index] !== undefined && ` · casa ${picked[index]}`}
              </li>
            ))}
          </ol>
          <div className="flex gap-1">
            <button type="button" onClick={onCancel} className={cn(button, "text-zinc-300 hover:text-white")}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={onUndo}
              disabled={picked.length === 0}
              className={cn(button, "text-zinc-300 hover:text-white")}
            >
              Desfazer
            </button>
          </div>
        </section>
      </div>

      {done && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Confirmar ${title}`}
          className="animate-in fade-in absolute inset-0 z-50 grid place-items-center bg-black/55 p-4 duration-200"
        >
          <section className="hud-panel flex w-full max-w-sm flex-col items-center gap-4 p-5 text-center">
            <h2 className={cn("text-lg font-black tracking-wide uppercase", tone)}>São estas casas?</h2>
            <ul className="flex flex-col gap-1.5">
              {steps.map((step, index) => (
                <li key={step.name} className="text-sm text-zinc-200">
                  <span className="font-bold">{step.name}</span> · casa {picked[index]}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onUndo}
                className={cn(button, "px-4 py-2 text-zinc-300 ring-1 ring-white/15 hover:text-white")}
              >
                Refazer
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={cn(button, "bg-white/15 px-5 py-2 text-white ring-1 ring-white/30 hover:bg-white/25")}
              >
                {confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
