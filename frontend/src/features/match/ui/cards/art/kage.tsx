import type { ReactNode } from "react";

type KageCard = "bloodTear" | "scarletMirage" | "amaterasuBreeze" | "susanooSword" | "eternalEclipse";

/** Kage Rubra's own: black fire, the red eye, the Susanoo. */
export const kageArt: Record<KageCard, ReactNode> = {
  // A red eye weeping a drop of blood over a black flame.
  bloodTear: (
    <g>
      <path d="M26 30 Q50 12 74 30 Q50 48 26 30 Z" fill="#fee2e2" stroke="#450a0a" strokeWidth="1.5" />
      <circle cx="50" cy="30" r="9" fill="#dc2626" />
      <circle cx="50" cy="30" r="3.5" fill="#0a0a0a" />
      <path d="M56 40 Q60 48 56 52 Q52 48 56 40 Z" fill="#b91c1c" />
      <path d="M38 64 Q42 52 46 60 Q50 48 54 60 Q58 54 62 64 Z" fill="#0a0a0a" stroke="#7f1d1d" strokeWidth="1" />
    </g>
  ),
  // A ghostly double drawn onto a black flame.
  scarletMirage: (
    <g>
      <circle cx="28" cy="28" r="6" fill="#fda4af" opacity="0.45" />
      <path d="M22 50 L28 36 L34 50 Z" fill="#fda4af" opacity="0.45" />
      <path d="M38 40 Q52 34 62 44" stroke="#e11d48" strokeWidth="2" fill="none" strokeDasharray="3 3" />
      <path d="M60 60 Q64 40 70 52 Q74 34 80 52 Q84 44 86 60 Z" fill="#0a0a0a" stroke="#be123c" strokeWidth="1.2" />
      <circle cx="73" cy="34" r="5" fill="#fecdd3" />
    </g>
  ),
  // Black flames bending in a gust, spreading to the right.
  amaterasuBreeze: (
    <g>
      <path d="M14 30 Q40 22 70 30" stroke="#a1a1aa" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M20 22 Q44 14 64 20" stroke="#71717a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M18 62 Q24 40 30 54 Q36 36 42 54 Q48 44 50 62 Z" fill="#000000" stroke="#ef4444" strokeWidth="1" />
      <path d="M52 62 Q58 44 64 56 Q70 42 76 56 Q82 48 84 62 Z" fill="#0a0a0a" stroke="#f87171" strokeWidth="1" />
    </g>
  ),
  // The spectral giant's blade, point down, wreathed in crimson.
  susanooSword: (
    <g>
      <path d="M50 10 L56 18 L54 54 L50 62 L46 54 L44 18 Z" fill="#fecdd3" stroke="#9f1239" strokeWidth="1.5" />
      <rect x="36" y="16" width="28" height="4" rx="2" fill="#7f1d1d" />
      <path d="M30 40 Q50 20 70 40" stroke="#e11d48" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M24 50 Q50 26 76 50" stroke="#fb7185" strokeWidth="1.4" fill="none" opacity="0.5" />
    </g>
  ),
  // A black sun ringed in red over a line of fires.
  eternalEclipse: (
    <g>
      <circle cx="50" cy="28" r="16" fill="#dc2626" opacity="0.85" />
      <circle cx="50" cy="28" r="13" fill="#000000" />
      <circle cx="50" cy="28" r="20" fill="none" stroke="#fca5a5" strokeWidth="1" opacity="0.6" />
      <path d="M14 64 Q20 50 26 60 Q32 48 38 60 Q44 52 50 64 Z" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" />
      <path d="M50 64 Q56 50 62 60 Q68 48 74 60 Q80 52 86 64 Z" fill="#0a0a0a" stroke="#ef4444" strokeWidth="1" />
    </g>
  ),
};
