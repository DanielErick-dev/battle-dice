import type { ReactNode } from "react";
import { Star } from "./Star";

type ThemisCard = "blindJustice" | "confiscation" | "justiceMark" | "containmentDecree" | "finalJudgment";

/** Themis's own. */
export const themisArt: Record<ThemisCard, ReactNode> = {
  // A blindfold over a row of footsteps all marching the same way.
  blindJustice: (
    <g>
      {[22, 40, 58, 76].map((x, i) => (
        <g key={x} fill="#fef3c7" opacity={0.55 + i * 0.12}>
          <ellipse cx={x} cy={i % 2 ? 54 : 60} rx="4" ry="6" />
          <path d={`M${x + 6} 57 l5 0 l-2 -3 M${x + 11} 57 l-2 3`} stroke="#fef3c7" strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <path d="M14 24 Q50 16 86 24 L86 34 Q50 26 14 34 Z" fill="#fffbeb" stroke="#fbbf24" strokeWidth="1.5" />
      <path d="M86 28 Q94 38 88 48 M86 30 Q98 34 96 44" fill="none" stroke="#fffbeb" strokeWidth="2.5" />
    </g>
  ),
  // A gauntlet closing on a card, a golden seal of the court on it.
  confiscation: (
    <g>
      <rect
        x="40"
        y="14"
        width="26"
        height="36"
        rx="3"
        fill="#f5f5f4"
        stroke="#a8a29e"
        strokeWidth="1.5"
        transform="rotate(12 53 32)"
      />
      <circle cx="54" cy="32" r="6" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
      <path
        d="M20 66 L28 44 Q30 38 36 40 L38 30 Q40 25 44 28 L46 40 L52 36 Q56 34 56 40 L50 56 Q46 66 36 66 Z"
        fill="#57534e"
        stroke="#d6d3d1"
        strokeWidth="1.5"
      />
    </g>
  ),
  // The court's golden brand: a balance inside a turning ring of runes.
  justiceMark: (
    <g>
      <circle cx="50" cy="38" r="26" fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="50" cy="38" r="19" fill="#451a03" stroke="#fbbf24" strokeWidth="2.5" />
      <g stroke="#fde68a" strokeLinecap="round">
        <line x1="50" y1="26" x2="50" y2="50" strokeWidth="2" />
        <line x1="38" y1="31" x2="62" y2="31" strokeWidth="2" />
        <path d="M34 42 Q38 47 42 42 Z M58 42 Q62 47 66 42 Z" fill="#fbbf24" strokeWidth="1" />
        <path d="M38 31 L35 42 M38 31 L41 42 M62 31 L59 42 M62 31 L65 42" strokeWidth="0.8" />
        <line x1="44" y1="51" x2="56" y2="51" strokeWidth="2" />
      </g>
    </g>
  ),
  // A die bound in chains, sealed by the court's wax: nothing above three.
  containmentDecree: (
    <g>
      <rect x="32" y="18" width="36" height="36" rx="6" fill="#f5f5f4" stroke="#78716c" strokeWidth="2" />
      {[
        [42, 28],
        [50, 36],
        [58, 44],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3.5" fill="#1c1917" />
      ))}
      <path d="M18 26 L82 50 M18 50 L82 26" stroke="#a8a29e" strokeWidth="3.5" strokeDasharray="6 3" />
      <circle cx="50" cy="60" r="8" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.5" />
      <text x="50" y="64" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fef3c7">
        3
      </text>
    </g>
  ),
  // Her sword driven down through a burst of light: the last word.
  finalJudgment: (
    <g strokeLinecap="round">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={50 + Math.cos(angle) * 10}
            y1={40 + Math.sin(angle) * 10}
            x2={50 + Math.cos(angle) * 32}
            y2={40 + Math.sin(angle) * 32}
            stroke="#fef3c7"
            strokeWidth="1.5"
            opacity="0.7"
          />
        );
      })}
      <path d="M46 22 L54 22 L52 60 L50 66 L48 60 Z" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
      <line x1="36" y1="20" x2="64" y2="20" stroke="#fbbf24" strokeWidth="4" />
      <rect x="47.5" y="6" width="5" height="13" rx="1.5" fill="#78350f" />
      <circle cx="50" cy="5" r="3" fill="#fbbf24" />
      {[
        [24, 16],
        [76, 18],
      ].map(([x, y]) => (
        <Star key={x} x={x} y={y} r={3} fill="#fde68a" />
      ))}
    </g>
  ),
};
