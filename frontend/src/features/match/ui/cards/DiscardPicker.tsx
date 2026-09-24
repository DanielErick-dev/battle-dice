import type { CardInstance } from "@/game/domain/types";
import { CardView } from "./CardView";
import { CARD_TEXT } from "./cardText";

interface DiscardPickerProps {
  hand: readonly CardInstance[];
  drawn: CardInstance;
  onDiscard: (cardUid: string) => void;
}

/** Hand overflowed: pick which card to throw away (the one just drawn included). */
export function DiscardPicker({ hand, drawn, onDiscard }: DiscardPickerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/65 p-4 backdrop-blur-sm duration-300"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="text-center">
          <h2 id="discard-title" className="text-2xl font-black tracking-wide text-white uppercase">
            Mão cheia!
          </h2>
          <p className="mt-1 text-sm text-zinc-300">Escolha uma carta para descartar.</p>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...hand, drawn].map((card) => (
            <li key={card.uid} className="relative w-32 sm:w-40">
              {card.uid === drawn.uid && (
                <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow">
                  Nova
                </span>
              )}
              <button
                type="button"
                onClick={() => onDiscard(card.uid)}
                aria-label={`Descartar ${CARD_TEXT[card.cardId].name}`}
                className="group block w-full rounded-xl transition hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-red-400"
              >
                <CardView cardId={card.cardId} />
                <span className="mt-2 block rounded-lg bg-red-600/80 py-1.5 text-center text-[11px] font-black tracking-wider text-white uppercase opacity-70 transition group-hover:opacity-100">
                  Descartar
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
