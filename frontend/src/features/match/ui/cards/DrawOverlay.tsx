import type { CardDrawView } from "../../model/matchView";
import { CardBack } from "./CardBack";
import { CardView } from "./CardView";

/**
 * A card coming off the deck: it rises to the middle of the screen face down, turns face up
 * and is dealt to the hand at the side (keyed by draw id so each draw replays it). A card taken
 * from another player's hand says whose it was.
 */
export function DrawOverlay({ drawing }: { drawing: CardDrawView | null }) {
  if (!drawing) return null;

  return (
    <div key={drawing.id} className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden>
      <div className="relative w-44 sm:w-52" style={{ animation: "card-draw-travel 1.5s ease-in-out forwards" }}>
        {drawing.takenFrom && (
          <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-full bg-rose-600 px-3 py-1 text-xs font-black tracking-wider whitespace-nowrap text-white uppercase shadow-[0_0_20px_rgba(225,29,72,0.7)]">
            Roubada de {drawing.takenFrom}
          </span>
        )}
        <div
          className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.7),rgba(167,139,250,0.25)_45%,transparent_70%)] opacity-0"
          style={{ animation: "card-draw-burst 1.5s ease-out forwards" }}
        />
        <div
          className="relative [transform-style:preserve-3d]"
          style={{ animation: "card-draw-flip 1.5s ease-in-out forwards" }}
        >
          <div className="[backface-visibility:hidden]">
            <CardView cardId={drawing.card.cardId} />
          </div>
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <CardBack />
          </div>
        </div>
      </div>
    </div>
  );
}
