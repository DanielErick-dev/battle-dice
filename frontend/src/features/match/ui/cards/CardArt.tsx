import type { ReactNode } from "react";
import type { CardId } from "@/game/domain/cards";

/** Background gradient behind each card's artwork. */
export const CARD_PALETTE: Readonly<Record<CardId, { from: string; to: string }>> = {
  windStep: { from: "#3b82f6", to: "#1e3a8a" },
  healingHerb: { from: "#16a34a", to: "#052e16" },
  arcaneShield: { from: "#0891b2", to: "#083344" },
  berserkFury: { from: "#dc2626", to: "#450a0a" },
  arcaneBlast: { from: "#2563eb", to: "#0b1540" },
  blindingFlash: { from: "#f59e0b", to: "#78350f" },
  mysticGate: { from: "#7c3aed", to: "#1e1b4b" },
  fateRune: { from: "#ea580c", to: "#431407" },
  ancientScroll: { from: "#a16207", to: "#292524" },
  luckyCharm: { from: "#22c55e", to: "#14532d" },
  oracleEye: { from: "#6d28d9", to: "#0f0a2e" },
  ancestralAwakening: { from: "#f59e0b", to: "#451a03" },
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
  windStep: (
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
  healingHerb: (
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
  arcaneShield: (
    <g fill="none">
      <polygon points="50,8 76,22 76,48 50,62 24,48 24,22" fill="#22d3ee" fillOpacity="0.25" stroke="#a5f3fc" strokeWidth="3" />
      <polygon points="50,20 65,28 65,42 50,50 35,42 35,28" stroke="#67e8f9" strokeWidth="2" />
      <path d="M50 8 V20 M76 22 L65 28 M76 48 L65 42 M50 62 V50 M24 48 L35 42 M24 22 L35 28" stroke="#67e8f9" strokeWidth="1.5" />
    </g>
  ),
  berserkFury: (
    <g>
      <path d="M50 64 C24 60 22 36 34 22 C34 34 42 34 42 26 C44 14 52 8 50 4 C62 12 70 22 66 34 C72 30 74 24 74 20 C84 36 78 60 50 64 Z" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
      <path d="M50 58 C36 54 36 40 44 32 C46 40 54 38 52 30 C62 38 64 52 50 58 Z" fill="#fecaca" />
      <text x="50" y="52" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7f1d1d">x2</text>
    </g>
  ),
  arcaneBlast: (
    <g>
      <defs>
        <radialGradient id="blast-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#93c5fd" />
          <stop offset="1" stopColor="#1d4ed8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M34 26 L100 18 L100 52 L34 44 Z" fill="#60a5fa" opacity="0.55" />
      <path d="M34 31 L100 28 L100 42 L34 39 Z" fill="#dbeafe" />
      <circle cx="30" cy="35" r="20" fill="url(#blast-core)" />
    </g>
  ),
  blindingFlash: (
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
  mysticGate: (
    <g fill="none">
      <ellipse cx="50" cy="36" rx="22" ry="28" stroke="#c4b5fd" strokeWidth="3" />
      <ellipse cx="50" cy="36" rx="15" ry="20" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 3" />
      <ellipse cx="50" cy="36" rx="8" ry="11" fill="#ede9fe" fillOpacity="0.85" />
      {[
        [20, 14],
        [82, 18],
        [80, 58],
        [18, 56],
      ].map(([x, y]) => (
        <Star key={`${x}${y}`} x={x} y={y} r={3} fill="#ddd6fe" />
      ))}
    </g>
  ),
  fateRune: (
    <g>
      <path d="M50 6 L78 24 L72 60 L28 60 L22 24 Z" fill="#78350f" stroke="#fdba74" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 16 V52 M50 26 L62 18 M50 26 L38 18 M50 40 L62 48 M50 40 L38 48" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="33" r="18" fill="none" stroke="#fb923c" strokeOpacity="0.5" strokeWidth="1.5" />
    </g>
  ),
  ancientScroll: (
    <g>
      <rect x="26" y="14" width="48" height="42" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
      <rect x="20" y="8" width="60" height="9" rx="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
      <rect x="20" y="53" width="60" height="9" rx="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
      {[24, 31, 38, 45].map((y, i) => (
        <line key={y} x1="32" y1={y} x2={i % 2 === 0 ? 68 : 60} y2={y} stroke="#92400e" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      ))}
    </g>
  ),
  luckyCharm: (
    <g>
      <path d="M50 4 V16" stroke="#e5e7eb" strokeWidth="1.5" />
      <circle cx="50" cy="38" r="22" fill="#15803d" stroke="#fde047" strokeWidth="3" />
      {[0, 90, 180, 270].map((angle) => (
        <ellipse key={angle} cx="50" cy="29" rx="6" ry="9" fill="#86efac" transform={`rotate(${angle} 50 38)`} />
      ))}
      <circle cx="50" cy="38" r="3" fill="#fde047" />
      <text x="80" y="64" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fef9c3">+2</text>
    </g>
  ),
  oracleEye: (
    <g>
      <path d="M12 35 Q50 2 88 35 Q50 68 12 35 Z" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="2.5" />
      <circle cx="50" cy="35" r="14" fill="#7c3aed" />
      <circle cx="50" cy="35" r="7" fill="#0f0a2e" />
      <circle cx="45" cy="30" r="3" fill="#ffffff" opacity="0.9" />
      {[-40, -20, 0, 20, 40].map((dx) => (
        <line key={dx} x1={50 + dx} y1="12" x2={50 + dx * 1.2} y2="4" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </g>
  ),
  ancestralAwakening: (
    <g>
      <defs>
        <radialGradient id="awakening-core">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="36" r="30" fill="url(#awakening-core)" />
      <circle cx="50" cy="36" r="22" fill="none" stroke="#fef3c7" strokeWidth="1.5" strokeDasharray="2 4" />
      <path d="M50 14 L56 30 L72 36 L56 42 L50 58 L44 42 L28 36 L44 30 Z" fill="#fffbeb" />
      <text x="82" y="64" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff7ed">+3</text>
    </g>
  ),
};
