import { useState } from "react";
import type { CardInstance } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { CardView } from "./CardView";
import { CARD_TEXT } from "./cardText";

/** Colours of each kind of pick (static class names, so Tailwind keeps them). */
const ACCENTS = {
  teal: {
    title: "text-teal-300",
    ring: "ring-teal-300",
    focus: "focus-visible:outline-teal-400",
    chosen: "bg-teal-500",
    idle: "bg-teal-700/70",
    button: "bg-teal-500 hover:bg-teal-400",
  },
  sky: {
    title: "text-sky-300",
    ring: "ring-sky-300",
    focus: "focus-visible:outline-sky-400",
    chosen: "bg-sky-500",
    idle: "bg-sky-800/70",
    button: "bg-sky-500 hover:bg-sky-400",
  },
} as const;

interface CardChoicePickerProps {
  title: string;
  subtitle: string;
  accent: keyof typeof ACCENTS;
  /** The cards to choose from, in the order shown. */
  cards: readonly CardInstance[];
  /** How many may be picked. */
  max: number;
  /** Exactly `max` must be picked, and there's no backing out (a plunder must be settled). */
  required?: boolean;
  confirmLabel: string;
  onPick: (cardUids: string[]) => void;
  onCancel?: () => void;
}

/**
 * Picks up to `max` cards (exactly `max` when `required`): from the discard pile to bring back
 * (Resurrection), from an opponent's hand to take (Spectral Plunder).
 */
export function CardChoicePicker({
  title,
  subtitle,
  accent,
  cards,
  max,
  required = false,
  confirmLabel,
  onPick,
  onCancel,
}: CardChoicePickerProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const colors = ACCENTS[accent];
  const toggle = (uid: string) =>
    setPicked((current) =>
      current.includes(uid)
        ? current.filter((held) => held !== uid)
        : current.length < max
          ? [...current, uid]
          : current,
    );
  const ready = required ? picked.length === max : picked.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-choice-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm duration-300"
    >
      <div className="flex max-h-full flex-col items-center gap-5">
        <div className="text-center">
          <h2 id="card-choice-title" className={cn("text-2xl font-black tracking-wide uppercase", colors.title)}>
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
        </div>

        <ul className="grid min-h-0 grid-cols-3 gap-3 overflow-y-auto p-2 sm:grid-cols-4 lg:grid-cols-6">
          {cards.map((card) => {
            const selected = picked.includes(card.uid);
            const full = !selected && picked.length >= max;
            return (
              <li key={card.uid} className="w-28 sm:w-32 lg:w-36">
                <button
                  type="button"
                  onClick={() => toggle(card.uid)}
                  disabled={full}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Desmarcar" : "Escolher"} ${CARD_TEXT[card.cardId].name}`}
                  className={cn(
                    "group block w-full rounded-xl transition focus-visible:outline-2",
                    colors.focus,
                    selected ? `-translate-y-1 ring-2 ${colors.ring}` : "hover:-translate-y-1",
                    full && "opacity-40",
                  )}
                >
                  <CardView cardId={card.cardId} />
                  <span
                    className={cn(
                      "mt-2 block rounded-lg py-1.5 text-center text-[11px] font-black tracking-wider text-white uppercase transition",
                      selected ? colors.chosen : `${colors.idle} opacity-70 group-hover:opacity-100`,
                    )}
                  >
                    {selected ? "Escolhida" : "Escolher"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-xs font-bold tracking-wider text-zinc-300 uppercase transition hover:text-white"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() => onPick(picked)}
            disabled={!ready}
            className={cn(
              "rounded-lg px-5 py-2 text-xs font-black tracking-wider text-white uppercase transition disabled:opacity-40",
              colors.button,
            )}
          >
            {confirmLabel} ({picked.length}/{max})
          </button>
        </div>
      </div>
    </div>
  );
}
