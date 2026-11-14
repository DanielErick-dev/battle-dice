import type { MatchFx } from "../../model/matchView";
import { CardView } from "./CardView";

/** Where each of the three copies flies in from: left, above, right. */
const COPIES = ["fusion-copy-left", "fusion-copy-top", "fusion-copy-right"] as const;

/** Keyed by fusion id so each one replays; lasts timings.fusionMs. */
export function FusionOverlay({ fusing }: { fusing: MatchFx["fusing"] }) {
  if (!fusing) return null;
  const { cardId } = fusing.card;

  return (
    <div key={fusing.id} className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden>
      <div className="absolute inset-0 bg-black/55" style={{ animation: "fusion-dim 2.6s ease-in-out forwards" }} />
      <div className="relative w-44 sm:w-52">
        {COPIES.map((animation) => (
          <div
            key={animation}
            className="absolute inset-0"
            style={{
              animation: `${animation} 1.25s cubic-bezier(0.55, 0, 0.75, 0.4) forwards`,
            }}
          >
            <CardView cardId={cardId} />
          </div>
        ))}
        {/* The flash where they meet, and rings of fire racing out of it. */}
        <div
          className="absolute -inset-24 rounded-full bg-[radial-gradient(circle,#fff_0%,rgba(254,215,170,0.95)_18%,rgba(249,115,22,0.6)_40%,rgba(192,38,211,0.25)_60%,transparent_72%)] opacity-0"
          style={{ animation: "fusion-flash 2.6s ease-out forwards" }}
        />
        {[0, 0.18].map((delay) => (
          <div
            key={delay}
            className="absolute inset-0 m-auto aspect-square w-full rounded-full border-4 border-amber-300 opacity-0 shadow-[0_0_30px_rgba(251,146,60,0.9)]"
            style={{
              animation: `fusion-ring 2.6s ease-out ${delay}s forwards`,
            }}
          />
        ))}
        <div className="relative opacity-0" style={{ animation: "fusion-reveal 2.6s ease-out forwards" }}>
          <CardView cardId={cardId} fused />
        </div>
      </div>
    </div>
  );
}
