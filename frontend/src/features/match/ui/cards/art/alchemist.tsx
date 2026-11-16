import type { ReactNode } from "react";

type AlchemistCard = "catalyticStep" | "polarityContamination" | "graveyardRaider" | "strictEquivalence" | "magnumOpus";

/** The Alchemist's own (fallbacks for the painted art). */
export const alchemistArt: Record<AlchemistCard, ReactNode> = {
  // A vial shattering on a red tile that turns green.
  catalyticStep: (
    <g>
      <rect x="24" y="44" width="52" height="16" rx="2" fill="#b91c1c" />
      <path d="M50 44 L76 44 L76 60 L50 60 Z" fill="#10b981" />
      <circle cx="50" cy="30" r="9" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />
      <rect x="47" y="16" width="6" height="7" fill="#a7f3d0" />
    </g>
  ),
  // A thrown flask leaving a purple trail onto a cracked tile.
  polarityContamination: (
    <g>
      <path d="M18 20 Q50 6 70 40" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="4 3" />
      <circle cx="70" cy="44" r="8" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
      <path d="M56 58 L84 58 M62 52 L70 60 L78 52" stroke="#c084fc" strokeWidth="2" fill="none" />
    </g>
  ),
  // Two glowing cards rising from a grave.
  graveyardRaider: (
    <g>
      <path d="M38 62 L38 30 Q50 18 62 30 L62 62 Z" fill="#52525b" stroke="#27272a" strokeWidth="1.5" />
      <rect x="26" y="20" width="14" height="20" rx="2" fill="#6ee7b7" transform="rotate(-15 33 30)" />
      <rect x="60" y="20" width="14" height="20" rx="2" fill="#6ee7b7" transform="rotate(15 67 30)" />
    </g>
  ),
  // Two tiles trading places along crossed arrows.
  strictEquivalence: (
    <g strokeWidth="2.5" fill="none">
      <rect x="18" y="40" width="22" height="14" rx="2" fill="#b91c1c" stroke="none" />
      <rect x="60" y="40" width="22" height="14" rx="2" fill="#2563eb" stroke="none" />
      <path d="M30 34 Q50 14 70 34" stroke="#34d399" />
      <path d="M70 60 Q50 72 30 60" stroke="#a78bfa" />
    </g>
  ),
  // The philosopher's stone, red and blazing.
  magnumOpus: (
    <g>
      <circle cx="50" cy="35" r="22" fill="none" stroke="#a3e635" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M50 16 L64 30 L58 52 L42 52 L36 30 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
      <path d="M50 16 L50 52 M36 30 L64 30" stroke="#fca5a5" strokeWidth="1" />
    </g>
  ),
};
