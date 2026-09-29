import { cn } from "@/lib/utils";

/** The back every card shares: an arcane seal on deep violet, same frame as a card face. */
export function CardBack({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-[5/7] w-full overflow-hidden rounded-xl bg-amber-700/80 p-[3px]", className)}>
      <div className="relative h-full w-full overflow-hidden rounded-[9px] bg-[radial-gradient(circle_at_50%_45%,#4c1d95,#1e1b4b_60%,#0b0a1a)]">
        <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect x="6" y="6" width="88" height="128" rx="6" fill="none" stroke="#fbbf24" strokeOpacity="0.55" strokeWidth="1.5" />
          <circle cx="50" cy="70" r="30" fill="none" stroke="#fcd34d" strokeOpacity="0.7" strokeWidth="1.5" />
          <circle cx="50" cy="70" r="22" fill="none" stroke="#c4b5fd" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="3 3" />
          <polygon points="50,44 72,83 28,83" fill="none" stroke="#fde68a" strokeWidth="1.5" />
          <polygon points="50,96 28,57 72,57" fill="none" stroke="#fde68a" strokeWidth="1.5" />
          <circle cx="50" cy="70" r="5" fill="#fef3c7" />
          {[
            [16, 16],
            [84, 16],
            [16, 124],
            [84, 124],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.5" fill="#fbbf24" fillOpacity="0.8" />
          ))}
        </svg>
      </div>
    </div>
  );
}
