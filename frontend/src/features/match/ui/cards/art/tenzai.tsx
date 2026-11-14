import type { ReactNode } from "react";

type TenzaiCard =
  "tectonicFortification" | "riptideLash" | "forcedTailwind" | "elementalExchange" | "elementalConvergence";

/** Tenzai's own. */
export const tenzaiArt: Record<TenzaiCard, ReactNode> = {
  // A stone wall stacked twice as high.
  tectonicFortification: (
    <g stroke="#451a03" strokeWidth="1.2">
      <rect x="28" y="40" width="44" height="18" rx="2" fill="#a16207" />
      <rect x="32" y="22" width="36" height="18" rx="2" fill="#ca8a04" />
      <path d="M28 49 L72 49 M50 40 L50 58 M40 22 L40 40 M60 22 L60 40 M32 31 L68 31" fill="none" />
      <path d="M50 8 L56 16 L44 16 Z" fill="#fde68a" stroke="none" />
    </g>
  ),
  // A whip of water snapping between two places.
  riptideLash: (
    <g>
      <path d="M14 50 Q30 18 50 36 Q70 54 86 22" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 50 Q30 18 50 36 Q70 54 86 22" fill="none" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="52" r="5" fill="#0ea5e9" />
      <circle cx="86" cy="20" r="5" fill="#0ea5e9" />
    </g>
  ),
  // A gust shoving a die forward.
  forcedTailwind: (
    <g strokeLinecap="round">
      <path
        d="M10 26 Q36 20 50 30 M8 38 Q34 34 48 40 M12 50 Q36 48 50 50"
        fill="none"
        stroke="#a7f3d0"
        strokeWidth="2.5"
      />
      <rect x="56" y="26" width="24" height="24" rx="4" fill="#ecfdf5" transform="rotate(14 68 38)" />
      <circle cx="64" cy="34" r="2" fill="#065f46" />
      <circle cx="72" cy="42" r="2" fill="#065f46" />
      <text x="82" y="22" fontSize="11" fontWeight="900" fill="#6ee7b7">
        +3
      </text>
    </g>
  ),
  // One element turning into another inside a ring of fire.
  elementalExchange: (
    <g>
      <circle cx="50" cy="36" r="24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeDasharray="6 4" />
      <path d="M38 30 A14 14 0 0 1 62 30" fill="none" stroke="#fde68a" strokeWidth="2.5" />
      <path d="M62 30 L58 24 M62 30 L66 25" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M62 44 A14 14 0 0 1 38 44" fill="none" stroke="#7dd3fc" strokeWidth="2.5" />
      <path d="M38 44 L42 50 M38 44 L34 49" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  // The four elements meeting in one bright core.
  elementalConvergence: (
    <g>
      <circle cx="30" cy="20" r="7" fill="#a16207" />
      <circle cx="70" cy="20" r="7" fill="#38bdf8" />
      <circle cx="30" cy="52" r="7" fill="#f97316" />
      <circle cx="70" cy="52" r="7" fill="#a7f3d0" />
      <path
        d="M36 24 L46 32 M64 24 L54 32 M36 48 L46 40 M64 48 L54 40"
        stroke="#e0f2fe"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="36" r="9" fill="#ecfeff" />
      <circle cx="50" cy="36" r="4" fill="#ffffff" />
    </g>
  ),
};
