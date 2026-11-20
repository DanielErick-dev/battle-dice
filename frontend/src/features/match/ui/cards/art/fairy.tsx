import type { ReactNode } from "react";

type FairyCard = "frostBreath" | "slipperyTrack" | "crystalWings" | "glacialHarvest" | "absoluteZero";

/** The Crystal Fairy's own: frost, snow and crystal wings (placeholders until the painted art). */
export const fairyArt: Record<FairyCard, ReactNode> = {
  // A breath of frost settling into a snowflake.
  frostBreath: (
    <g stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round">
      <path d="M50 18 V52 M35 26 L65 44 M35 44 L65 26" />
      <path d="M18 60 Q34 52 50 58 Q66 64 82 56" fill="none" stroke="#a5f3fc" strokeDasharray="3 3" />
    </g>
  ),
  // A figure sliding along an icy streak.
  slipperyTrack: (
    <g>
      <path d="M10 56 L90 48" stroke="#bae6fd" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <circle cx="62" cy="30" r="5" fill="#f0f9ff" />
      <path d="M56 46 L62 36 L70 44" stroke="#f0f9ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 40 H46 M26 34 H40" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  // Two crystal wings over a snowy tile.
  crystalWings: (
    <g>
      <path d="M50 34 L22 16 L28 40 Z" fill="#e0f2fe" opacity="0.85" stroke="#7dd3fc" />
      <path d="M50 34 L78 16 L72 40 Z" fill="#e0f2fe" opacity="0.85" stroke="#7dd3fc" />
      <rect x="34" y="52" width="32" height="8" rx="2" fill="#f0f9ff" />
    </g>
  ),
  // An icy hand closing round a card.
  glacialHarvest: (
    <g>
      <rect x="40" y="18" width="20" height="28" rx="2" fill="#f8fafc" stroke="#0ea5e9" />
      <path
        d="M30 56 Q36 40 44 46 M70 56 Q64 40 56 46"
        stroke="#7dd3fc"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  ),
  // A pale sun frozen over a row of ice spikes.
  absoluteZero: (
    <g>
      <circle cx="50" cy="26" r="12" fill="#f0f9ff" opacity="0.9" />
      <path d="M16 62 L24 44 L32 62 L40 40 L48 62 L56 42 L64 62 L72 46 L80 62 Z" fill="#bae6fd" stroke="#0369a1" />
    </g>
  ),
};
