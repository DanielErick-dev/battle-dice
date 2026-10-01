import type { CardInstance } from "@/game/domain/types";
import { CardView } from "./CardView";
import { CARD_TEXT } from "./cardText";

interface TransmutePickerProps {
  hand: readonly CardInstance[];
  onPick: (cardUid: string) => void;
  onCancel: () => void;
}

/** Transmutation: pick the hand card to turn into a random rare or epic. */
export function TransmutePicker({ hand, onPick, onCancel }: TransmutePickerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transmute-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/65 p-4 backdrop-blur-sm duration-300"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="text-center">
          <h2 id="transmute-title" className="text-2xl font-black tracking-wide text-emerald-300 uppercase">
            Transmutação
          </h2>
          <p className="mt-1 text-sm text-zinc-300">Escolha uma carta: ela vira uma rara ou épica aleatória.</p>
        </div>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {hand.map((card) => (
            <li key={card.uid} className="w-28 sm:w-32 lg:w-36">
              <button
                type="button"
                onClick={() => onPick(card.uid)}
                aria-label={`Transmutar ${CARD_TEXT[card.cardId].name}`}
                className="group block w-full rounded-xl transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <CardView cardId={card.cardId} />
                <span className="mt-2 block rounded-lg bg-emerald-600/80 py-1.5 text-center text-[11px] font-black tracking-wider text-white uppercase opacity-70 transition group-hover:opacity-100">
                  Transmutar
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-xs font-bold tracking-wider text-zinc-300 uppercase transition hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
