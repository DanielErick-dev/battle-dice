import type { ReactNode } from "react";
import type { CardId } from "@/game/domain/cards";

/** Background gradient behind each card's artwork. */
export const CARD_PALETTE: Readonly<Record<CardId, { from: string; to: string }>> = {
  flyingNimbus: { from: "#3b82f6", to: "#1e3a8a" },
  senzuBean: { from: "#16a34a", to: "#052e16" },
  kiBarrier: { from: "#0891b2", to: "#083344" },
  kaioken: { from: "#dc2626", to: "#450a0a" },
  kamehameha: { from: "#2563eb", to: "#0b1540" },
  solarFlare: { from: "#f59e0b", to: "#78350f" },
  instantTransmission: { from: "#7c3aed", to: "#1e1b4b" },
  dragonBall: { from: "#ea580c", to: "#431407" },
};

/** Procedural artwork for each card (inline SVG, 100×70 viewBox): no image files or rights. */
export function CardArt({ cardId }: { cardId: CardId }) {
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full" aria-hidden>
      {ART[cardId]}
    </svg>
  );
}

const Star = ({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`;
  }).join(" ");
  return <polygon points={points} fill={fill} />;
};

const ART: Record<CardId, ReactNode> = {
  flyingNimbus: (
    <g>
      {[20, 30, 40].map((y, i) => (
        <line key={y} x1={8 + i * 4} y1={y + 8} x2={26 + i * 4} y2={y + 8} stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      ))}
      <g fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5">
        <circle cx="42" cy="44" r="11" />
        <circle cx="56" cy="36" r="14" />
        <circle cx="72" cy="42" r="11" />
        <circle cx="84" cy="47" r="7" />
        <rect x="36" y="44" width="52" height="11" rx="5.5" />
      </g>
      <circle cx="52" cy="31" r="4" fill="#fff7cc" opacity="0.8" />
    </g>
  ),
  senzuBean: (
    <g>
      <ellipse cx="50" cy="38" rx="20" ry="12" transform="rotate(-25 50 38)" fill="#4ade80" stroke="#14532d" strokeWidth="2" />
      <path d="M36 44 Q50 34 64 30" stroke="#166534" strokeWidth="2" fill="none" />
      <ellipse cx="44" cy="32" rx="6" ry="3" transform="rotate(-25 44 32)" fill="#bbf7d0" opacity="0.8" />
      {[
        [22, 18],
        [78, 22],
        [74, 54],
        [26, 52],
      ].map(([x, y]) => (
        <Star key={`${x}${y}`} x={x} y={y} r={3.5} fill="#dcfce7" />
      ))}
    </g>
  ),
  kiBarrier: (
    <g fill="none">
      <polygon points="50,8 76,22 76,48 50,62 24,48 24,22" fill="#22d3ee" fillOpacity="0.25" stroke="#a5f3fc" strokeWidth="3" />
      <polygon points="50,20 65,28 65,42 50,50 35,42 35,28" stroke="#67e8f9" strokeWidth="2" />
      <path d="M50 8 V20 M76 22 L65 28 M76 48 L65 42 M50 62 V50 M24 48 L35 42 M24 22 L35 28" stroke="#67e8f9" strokeWidth="1.5" />
    </g>
  ),
  kaioken: (
    <g>
      <path d="M50 64 C24 60 22 36 34 22 C34 34 42 34 42 26 C44 14 52 8 50 4 C62 12 70 22 66 34 C72 30 74 24 74 20 C84 36 78 60 50 64 Z" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
      <path d="M50 58 C36 54 36 40 44 32 C46 40 54 38 52 30 C62 38 64 52 50 58 Z" fill="#fecaca" />
      <text x="50" y="52" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7f1d1d">x2</text>
    </g>
  ),
  kamehameha: (
    <g>
      <defs>
        <radialGradient id="kameha-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#93c5fd" />
          <stop offset="1" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M34 26 L100 18 L100 52 L34 44 Z" fill="#60a5fa" opacity="0.55" />
      <path d="M34 31 L100 28 L100 42 L34 39 Z" fill="#dbeafe" />
      <circle cx="30" cy="35" r="20" fill="url(#kameha-core)" />
    </g>
  ),
  solarFlare: (
    <g>
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const long = i % 2 === 0 ? 30 : 20;
        return (
          <line
            key={i}
            x1={50 + Math.cos(angle) * 12}
            y1={35 + Math.sin(angle) * 12}
            x2={50 + Math.cos(angle) * long}
            y2={35 + Math.sin(angle) * long}
            stroke="#fef3c7"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="50" cy="35" r="12" fill="#fffbeb" stroke="#fde68a" strokeWidth="3" />
    </g>
  ),
  instantTransmission: (
    <g>
      {[0.25, 0.5, 1].map((opacity, i) => (
        <g key={i} opacity={opacity} transform={`translate(${(i - 2) * 12} 0)`}>
          <circle cx="62" cy="20" r="6" fill="#e9d5ff" />
          <path d="M54 30 H70 L66 52 H58 Z" fill="#c4b5fd" />
        </g>
      ))}
      <path d="M78 12 V60 M84 18 V54" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  dragonBall: (
    <g>
      <defs>
        <radialGradient id="dragon-ball" cx="0.38" cy="0.35">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.35" stopColor="#fdba74" />
          <stop offset="1" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="35" r="26" fill="url(#dragon-ball)" stroke="#9a3412" strokeWidth="1.5" />
      <Star x={42} y={30} r={5} fill="#dc2626" />
      <Star x={58} y={30} r={5} fill="#dc2626" />
      <Star x={42} y={44} r={5} fill="#dc2626" />
      <Star x={58} y={44} r={5} fill="#dc2626" />
      <ellipse cx="40" cy="20" rx="7" ry="4" fill="#ffffff" opacity="0.6" />
    </g>
  ),
};
