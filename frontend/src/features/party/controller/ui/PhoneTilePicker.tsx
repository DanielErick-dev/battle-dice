import type { Board, PlayerId, TileId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import type { MatchView } from "@/features/match/model/matchView";
import type { PlacementStep } from "@/features/match/ui/placementText";
import { tileOptions } from "../model/tileOptions";
import { PHONE } from "./phoneStyles";

interface PhoneTilePickerProps {
  title: string;
  tone: string;
  steps: readonly PlacementStep[];
  /** Still pickable (the ones already picked left out). */
  tiles: ReadonlySet<TileId>;
  picked: readonly TileId[];
  /** Fewer free tiles than steps. */
  short: boolean;
  confirmLabel: string;
  board: Board;
  view: MatchView;
  viewerId: PlayerId | null;
  onPick: (tile: TileId) => void;
  onUndo: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** The phone's stand-in for clicking glowing tiles on the board: a list of the tiles, each with what's there. */
export function PhoneTilePicker({
  title,
  tone,
  steps,
  tiles,
  picked,
  short,
  confirmLabel,
  board,
  view,
  viewerId,
  onPick,
  onUndo,
  onCancel,
  onConfirm,
}: PhoneTilePickerProps) {
  const next = steps[picked.length];
  const done = picked.length === steps.length;
  const options = tileOptions([...tiles], board, view, viewerId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex flex-col bg-[#05060b]/95 backdrop-blur-sm"
    >
      <header className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-4 pb-3">
        <h2 className={cn("text-xl font-black tracking-wide uppercase", tone)}>{title}</h2>
        <p className="text-sm text-zinc-300">
          {short
            ? "Não há casas livres suficientes."
            : next
              ? `Escolha a casa: ${next.name} (${next.effect.toLowerCase()}).`
              : "Tudo escolhido. Confira e confirme."}
        </p>
        <ol className="flex flex-wrap gap-1.5">
          {steps.map((step, index) => (
            <li
              key={step.name}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-black tracking-wider text-white uppercase",
                step.tone,
                index === picked.length ? "ring-2 ring-white" : index > picked.length && "opacity-40",
              )}
            >
              {step.tag}
              {picked[index] !== undefined && ` · ${picked[index]}`}
            </li>
          ))}
        </ol>
      </header>

      <ul className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 overflow-y-auto px-4 pb-2">
        {!done &&
          options.map((option) => (
            <li key={option.tile}>
              <button type="button" onClick={() => onPick(option.tile)} className={PHONE.row}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 font-mono text-lg font-black">
                  {option.tile}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-black">
                      {option.realm ? `${option.realm} · ` : ""}
                      {option.title}
                    </span>
                    {option.distance && <span className="text-xs text-zinc-400">{option.distance}</span>}
                  </span>
                  {option.notes.length > 0 && (
                    <span className="mt-0.5 block text-xs text-zinc-300">{option.notes.join(" · ")}</span>
                  )}
                  {option.occupants.length > 0 && (
                    <span className="mt-0.5 block text-xs font-semibold text-sky-300">
                      Aqui: {option.occupants.join(", ")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        {done &&
          steps.map((step, index) => (
            <li key={step.name} className="hud-panel px-4 py-3 text-sm text-zinc-200">
              <span className="font-bold">{step.name}</span> · casa {picked[index]}
            </li>
          ))}
      </ul>

      <footer className="mx-auto grid w-full max-w-md grid-cols-2 gap-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={done ? onUndo : onCancel} className={PHONE.secondary}>
          {done ? "Refazer" : "Cancelar"}
        </button>
        {done ? (
          <button type="button" onClick={onConfirm} className={cn(PHONE.primary, "h-12 text-base")}>
            {confirmLabel}
          </button>
        ) : (
          <button type="button" onClick={onUndo} disabled={picked.length === 0} className={PHONE.secondary}>
            Desfazer
          </button>
        )}
      </footer>
    </div>
  );
}
