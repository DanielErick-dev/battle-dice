import type { ReactNode } from "react";

type AkaneCard = "hotBlood" | "emberStep" | "scarletFever" | "pureFuel" | "scarletSupernova";

/** Akane's own. */
export const akaneArt: Record<AkaneCard, ReactNode> = {
  // A blast ring of heat throwing two figures back.
  hotBlood: (
    <g>
      <circle cx="50" cy="40" r="22" fill="none" stroke="#fdba74" strokeWidth="2" opacity="0.7" />
      <circle cx="50" cy="40" r="13" fill="#f97316" opacity="0.8" />
      <path d="M50 30 Q56 38 50 50 Q44 38 50 30 Z" fill="#fef3c7" />
      <path d="M18 40 L8 40 M82 40 L92 40" stroke="#fecaca" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  // A foot gliding over a lick of flame.
  emberStep: (
    <g>
      <path d="M14 56 Q30 30 42 50 Q50 26 60 50 Q70 32 86 56 Z" fill="#ea580c" />
      <path d="M26 56 Q38 40 46 54 Q54 38 64 54 Q72 44 78 56 Z" fill="#fde68a" />
      <path d="M30 26 L72 22" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
    </g>
  ),
  // A crown wrapped in fire: the leader burns.
  scarletFever: (
    <g>
      <path d="M32 46 L36 30 L44 40 L50 26 L56 40 L64 30 L68 46 Z" fill="#facc15" stroke="#78350f" strokeWidth="1.2" />
      <path d="M28 56 Q34 40 40 52 Q46 34 52 52 Q58 38 64 52 Q70 42 74 56 Z" fill="#dc2626" opacity="0.9" />
    </g>
  ),
  // Two dice soaked in a pouring flame.
  pureFuel: (
    <g>
      <rect x="26" y="34" width="20" height="20" rx="3" fill="#fff7ed" transform="rotate(-10 36 44)" />
      <rect x="54" y="32" width="20" height="20" rx="3" fill="#fff7ed" transform="rotate(12 64 42)" />
      <circle cx="36" cy="44" r="2" fill="#7c2d12" />
      <circle cx="60" cy="38" r="2" fill="#7c2d12" />
      <circle cx="68" cy="46" r="2" fill="#7c2d12" />
      <path d="M50 8 Q58 20 50 30 Q42 20 50 8 Z" fill="#f97316" />
    </g>
  ),
  // Every fire drawn into one blinding star.
  scarletSupernova: (
    <g strokeLinecap="round">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M${50 + Math.cos(angle) * 30} ${35 + Math.sin(angle) * 26} L${50 + Math.cos(angle) * 14} ${35 + Math.sin(angle) * 12}`}
            stroke="#fb923c"
            strokeWidth="2.5"
          />
        );
      })}
      <circle cx="50" cy="35" r="11" fill="#fef3c7" />
      <circle cx="50" cy="35" r="6" fill="#ffffff" />
    </g>
  ),
};
