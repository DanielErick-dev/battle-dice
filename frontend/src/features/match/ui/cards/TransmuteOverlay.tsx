import { DEFAULT_TIMINGS } from "../../config";
import type { CardTransmuteView } from "../../model/matchView";
import { CardView } from "./CardView";

/** The whole overlay: the change in the middle of the screen, then the deal to the hand. */
const DURATION = `${(DEFAULT_TIMINGS.transmuteMs + DEFAULT_TIMINGS.drawMs) / 1000}s`;

/** Puffs of the smoke cloud over the card: where each sits (share of the card) and when it swells. */
const SMOKE_PUFFS = [
  { left: 50, top: 50, size: 190, delay: 0 },
  { left: 25, top: 25, size: 150, delay: 0.1 },
  { left: 75, top: 25, size: 150, delay: 0.18 },
  { left: 25, top: 75, size: 155, delay: 0.06 },
  { left: 75, top: 75, size: 150, delay: 0.22 },
  { left: 50, top: 8, size: 140, delay: 0.26 },
  { left: 50, top: 94, size: 140, delay: 0.14 },
  { left: 10, top: 50, size: 130, delay: 0.3 },
  { left: 90, top: 50, size: 130, delay: 0.12 },
] as const;

/**
 * Two cards being transmuted into one: they rise to the middle of the screen, fanned out, are
 * swallowed whole by a cloud of emerald smoke (a solid veil under the puffs) and swapped for the
 * new card while hidden; as the smoke clears slowly the new card is there, then dealt to the hand
 * (keyed by id so each one replays it).
 */
export function TransmuteOverlay({ transmuting }: { transmuting: CardTransmuteView | null }) {
  if (!transmuting) return null;

  return (
    <div key={transmuting.id} className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden>
      <div className="relative w-44 sm:w-52" style={{ animation: `transmute-travel ${DURATION} ease-in-out forwards` }}>
        <div
          className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(110,231,183,0.85),rgba(16,185,129,0.35)_40%,transparent_70%)] opacity-0"
          style={{ animation: `transmute-burst ${DURATION} ease-out forwards` }}
        />
        <div className="relative" style={{ animation: `transmute-new ${DURATION} linear forwards` }}>
          <CardView cardId={transmuting.to.cardId} />
        </div>
        {/* The two sacrificed cards, fanned out, vanish together into the smoke. */}
        <div className="absolute inset-0" style={{ animation: `transmute-old ${DURATION} linear forwards` }}>
          <div className="absolute inset-0 translate-x-6 rotate-6">
            <CardView cardId={transmuting.sacrificed.cardId} />
          </div>
          <div className="absolute inset-0 -translate-x-6 -rotate-6">
            <CardView cardId={transmuting.from.cardId} />
          </div>
        </div>
        <div
          className="absolute -inset-3 rounded-2xl bg-[radial-gradient(ellipse,rgba(16,185,129,1),rgba(6,78,59,0.97)_65%,rgba(6,78,59,0.8))] opacity-0 blur-sm"
          style={{ animation: `transmute-veil ${DURATION} ease-in-out forwards` }}
        />
        {SMOKE_PUFFS.map((puff, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.95),rgba(6,95,70,0.75)_45%,transparent_70%)] opacity-0 blur-md"
            style={{
              left: `${puff.left}%`,
              top: `${puff.top}%`,
              width: `${puff.size}%`,
              aspectRatio: "1",
              animation: `transmute-smoke ${DURATION} ease-in-out ${puff.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
