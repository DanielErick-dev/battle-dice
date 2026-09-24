import type { CardCastView } from "../../model/matchView";
import { CardView } from "./CardView";

/**
 * The played card flying into the arena and bursting into light (keyed by cast id so each
 * cast replays the animation). Solar Flare also whites out the screen for a moment.
 */
export function CastOverlay({ cast }: { cast: CardCastView | null }) {
  if (!cast) return null;

  return (
    <div key={cast.id} className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden>
      <div className="w-40 opacity-0 sm:w-48" style={{ animation: "card-cast 1.1s ease-out forwards" }}>
        <CardView cardId={cast.card.cardId} />
      </div>
      {cast.card.cardId === "solarFlare" && (
        <div className="absolute inset-0 bg-white opacity-0" style={{ animation: "solar-flash 1.2s ease-out 0.7s forwards" }} />
      )}
    </div>
  );
}
