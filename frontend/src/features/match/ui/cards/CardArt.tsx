import type { ReactNode } from "react";
import type { CardId } from "@/game/domain/cards/catalog";

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
  fateSwap: { from: "#0d9488", to: "#1e1b4b" },
  abyssCall: { from: "#7f1d1d", to: "#09090b" },
  celestialLight: { from: "#fef9c3", to: "#ca8a04" },
  heavenlyAegis: { from: "#e0f2fe", to: "#0369a1" },
  ascension: { from: "#fae8ff", to: "#7e22ce" },
  scalesOfJustice: { from: "#93c5fd", to: "#0f172a" },
  swordOfLaw: { from: "#cbd5e1", to: "#1e293b" },
  weightOfGuilt: { from: "#64748b", to: "#020617" },
  sacredBlindfold: { from: "#bfdbfe", to: "#1e3a8a" },
  voidHunger: { from: "#4c1d95", to: "#000000" },
  hungryRift: { from: "#6d28d9", to: "#09090b" },
  voidEcho: { from: "#7c3aed", to: "#030712" },
  riftCall: { from: "#5b21b6", to: "#0a0a0a" },
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
        <line
          key={y}
          x1={8 + i * 4}
          y1={y + 8}
          x2={26 + i * 4}
          y2={y + 8}
          stroke="#fde68a"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
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
      <ellipse
        cx="50"
        cy="38"
        rx="20"
        ry="12"
        transform="rotate(-25 50 38)"
        fill="#4ade80"
        stroke="#14532d"
        strokeWidth="2"
      />
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
      <polygon
        points="50,8 76,22 76,48 50,62 24,48 24,22"
        fill="#22d3ee"
        fillOpacity="0.25"
        stroke="#a5f3fc"
        strokeWidth="3"
      />
      <polygon points="50,20 65,28 65,42 50,50 35,42 35,28" stroke="#67e8f9" strokeWidth="2" />
      <path
        d="M50 8 V20 M76 22 L65 28 M76 48 L65 42 M50 62 V50 M24 48 L35 42 M24 22 L35 28"
        stroke="#67e8f9"
        strokeWidth="1.5"
      />
    </g>
  ),
  berserkFury: (
    <g>
      <path
        d="M50 64 C24 60 22 36 34 22 C34 34 42 34 42 26 C44 14 52 8 50 4 C62 12 70 22 66 34 C72 30 74 24 74 20 C84 36 78 60 50 64 Z"
        fill="#ef4444"
        stroke="#fca5a5"
        strokeWidth="1.5"
      />
      <path d="M50 58 C36 54 36 40 44 32 C46 40 54 38 52 30 C62 38 64 52 50 58 Z" fill="#fecaca" />
      <text x="50" y="52" textAnchor="middle" fontSize="15" fontWeight="900" fill="#7f1d1d">
        x2
      </text>
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
      <path
        d="M50 6 L78 24 L72 60 L28 60 L22 24 Z"
        fill="#78350f"
        stroke="#fdba74"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M50 16 V52 M50 26 L62 18 M50 26 L38 18 M50 40 L62 48 M50 40 L38 48"
        stroke="#fde68a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="50" cy="33" r="18" fill="none" stroke="#fb923c" strokeOpacity="0.5" strokeWidth="1.5" />
    </g>
  ),
  ancientScroll: (
    <g>
      <rect x="26" y="14" width="48" height="42" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
      <rect x="20" y="8" width="60" height="9" rx="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
      <rect x="20" y="53" width="60" height="9" rx="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
      {[24, 31, 38, 45].map((y, i) => (
        <line
          key={y}
          x1="32"
          y1={y}
          x2={i % 2 === 0 ? 68 : 60}
          y2={y}
          stroke="#92400e"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
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
      <text x="80" y="64" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fef9c3">
        +2
      </text>
    </g>
  ),
  oracleEye: (
    <g>
      <path d="M12 35 Q50 2 88 35 Q50 68 12 35 Z" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="2.5" />
      <circle cx="50" cy="35" r="14" fill="#7c3aed" />
      <circle cx="50" cy="35" r="7" fill="#0f0a2e" />
      <circle cx="45" cy="30" r="3" fill="#ffffff" opacity="0.9" />
      {[-40, -20, 0, 20, 40].map((dx) => (
        <line
          key={dx}
          x1={50 + dx}
          y1="12"
          x2={50 + dx * 1.2}
          y2="4"
          stroke="#ddd6fe"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
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
      <text x="82" y="64" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff7ed">
        +3
      </text>
    </g>
  ),
  // Two figures trading places along a pair of curved arrows.
  fateSwap: (
    <g>
      <circle cx="28" cy="35" r="9" fill="#5eead4" />
      <circle cx="72" cy="35" r="9" fill="#c4b5fd" />
      <path d="M30 22 Q50 6 70 22" fill="none" stroke="#f0fdfa" strokeWidth="3" strokeLinecap="round" />
      <polygon points="70,22 61,20 67,13" fill="#f0fdfa" />
      <path d="M70 48 Q50 64 30 48" fill="none" stroke="#f0fdfa" strokeWidth="3" strokeLinecap="round" />
      <polygon points="30,48 39,50 33,57" fill="#f0fdfa" />
    </g>
  ),
  // A charred hand reaching out of a burning pit, dragging a small figure down by the ankle.
  abyssCall: (
    <g>
      <ellipse cx="50" cy="58" rx="34" ry="8" fill="#0a0506" stroke="#ef4444" strokeWidth="1.5" />
      <ellipse cx="50" cy="58" rx="24" ry="4.5" fill="#dc2626" opacity="0.55" />
      {[28, 40, 60, 72].map((x, i) => (
        <path
          key={x}
          d={`M${x} 58 q${i % 2 ? 4 : -4} -9 0 -16 q${i % 2 ? -3 : 3} 6 0 16`}
          fill="#f97316"
          opacity="0.8"
        />
      ))}
      <path
        d="M44 60 L45 40 L41 30 M45 40 L48 26 M46 38 L53 27 M47 40 L58 31 M47 44 L60 42"
        fill="none"
        stroke="#1c0a0a"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 60 L45 40 L41 30 M45 40 L48 26 M46 38 L53 27 M47 40 L58 31 M47 44 L60 42"
        fill="none"
        stroke="#ef4444"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <circle cx="66" cy="16" r="4.5" fill="#e4e4e7" />
      <path
        d="M66 21 L62 32 M64 25 L57 22 M64 25 L72 21 M62 32 L58 30 M62 32 L60 40"
        stroke="#e4e4e7"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  // A sun of white light pouring rays down over a full orb of energy.
  celestialLight: (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={50 + Math.cos(angle) * 16}
            y1={35 + Math.sin(angle) * 16}
            x2={50 + Math.cos(angle) * 30}
            y2={35 + Math.sin(angle) * 30}
            stroke="#fffbeb"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        );
      })}
      <circle cx="50" cy="35" r="13" fill="#fef08a" stroke="#ffffff" strokeWidth="2" />
      <circle cx="46" cy="31" r="4" fill="#ffffff" opacity="0.9" />
    </g>
  ),
  // A winged shield of light.
  heavenlyAegis: (
    <g>
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M${50 + side * 12} 30 Q${50 + side * 36} 14 ${50 + side * 44} 30 Q${50 + side * 34} 30 ${50 + side * 36} 40 Q${50 + side * 26} 36 ${50 + side * 14} 44 Z`}
          fill="#f0f9ff"
          opacity="0.9"
        />
      ))}
      <path
        d="M50 14 L66 20 L64 42 Q58 54 50 60 Q42 54 36 42 L34 20 Z"
        fill="#38bdf8"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <path d="M50 22 L50 50 M40 32 L60 32" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  // A figure rising through a halo on a beam of light.
  ascension: (
    <g>
      <path d="M38 70 L44 4 L56 4 L62 70 Z" fill="#faf5ff" opacity="0.35" />
      <ellipse cx="50" cy="16" rx="13" ry="4" fill="none" stroke="#fde68a" strokeWidth="2.5" />
      <circle cx="50" cy="28" r="6" fill="#f5d0fe" />
      <path d="M42 54 Q50 32 58 54 Z" fill="#f5d0fe" />
      {[30, 70].map((x) => (
        <path key={x} d={`M${x} 52 L${x} 38`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      ))}
      <polygon points="30,34 26,40 34,40" fill="#ffffff" opacity="0.8" />
      <polygon points="70,34 66,40 74,40" fill="#ffffff" opacity="0.8" />
    </g>
  ),
  // A golden balance, level: weighed and split.
  scalesOfJustice: (
    <g stroke="#fde68a" strokeLinecap="round">
      <line x1="50" y1="12" x2="50" y2="60" strokeWidth="3" />
      <line x1="30" y1="62" x2="70" y2="62" strokeWidth="3" />
      <line x1="22" y1="22" x2="78" y2="22" strokeWidth="2.5" />
      {[22, 78].map((x) => (
        <g key={x}>
          <path d={`M${x} 22 L${x - 9} 42 M${x} 22 L${x + 9} 42`} strokeWidth="1" />
          <path d={`M${x - 11} 42 Q${x} 52 ${x + 11} 42 Z`} fill="#fbbf24" strokeWidth="1.5" />
        </g>
      ))}
      <circle cx="50" cy="12" r="3.5" fill="#fef3c7" />
    </g>
  ),
  // A longsword point down, cross guard and all, under a ring of light.
  swordOfLaw: (
    <g strokeLinecap="round">
      <ellipse cx="50" cy="16" rx="16" ry="4" fill="none" stroke="#bfdbfe" strokeWidth="1.5" opacity="0.7" />
      <path d="M46 24 L54 24 L52 62 L50 67 L48 62 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
      <line x1="50" y1="26" x2="50" y2="60" stroke="#94a3b8" strokeWidth="0.8" />
      <line x1="36" y1="22" x2="64" y2="22" stroke="#fbbf24" strokeWidth="4" />
      <rect x="47.5" y="8" width="5" height="13" rx="1.5" fill="#78350f" />
      <circle cx="50" cy="7" r="3" fill="#fbbf24" />
    </g>
  ),
  // A heavy weight, chains to it, crushing cards.
  weightOfGuilt: (
    <g>
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={50 + side * 18 - 7}
          y="46"
          width="14"
          height="19"
          rx="2"
          fill="#e2e8f0"
          opacity="0.5"
          transform={`rotate(${side * 18} ${50 + side * 18} 56)`}
        />
      ))}
      <path d="M50 4 L50 20" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 2" />
      <path d="M34 50 L40 22 L60 22 L66 50 Z" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="50" cy="20" r="4" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      <text x="50" y="44" textAnchor="middle" fontSize="11" fontWeight="900" fill="#cbd5e1">
        ⚖
      </text>
    </g>
  ),
  // A blindfold, its knot trailing, over a trap coming apart.
  sacredBlindfold: (
    <g>
      <path d="M22 56 L36 46 L46 58 L56 46 L66 58 L78 50" fill="none" stroke="#f87171" strokeWidth="2" opacity="0.5" />
      <path d="M14 26 Q50 18 86 26 L86 36 Q50 28 14 36 Z" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
      <path d="M86 30 Q94 40 88 52 M86 32 Q98 36 96 46" fill="none" stroke="#eff6ff" strokeWidth="2.5" />
      {[
        [30, 14],
        [70, 12],
      ].map(([x, y]) => (
        <Star key={x} x={x} y={y} r={3} fill="#bfdbfe" />
      ))}
    </g>
  ),
  // A maw of darkness opening, ringed with violet.
  voidHunger: (
    <g>
      <ellipse cx="50" cy="36" rx="26" ry="20" fill="#000000" stroke="#a78bfa" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 30 + i * 5;
        return (
          <polygon
            key={i}
            points={`${x},${i % 2 ? 50 : 22} ${x + 3},${i % 2 ? 42 : 30} ${x + 6},${i % 2 ? 50 : 22}`}
            fill="#ddd6fe"
            opacity="0.7"
          />
        );
      })}
      <circle cx="50" cy="36" r="5" fill="#7c3aed" opacity="0.8" />
    </g>
  ),
  // A crack in the path swallowing a trap's spikes.
  hungryRift: (
    <g>
      <path d="M8 50 L92 50" stroke="#52525b" strokeWidth="10" />
      <path
        d="M30 50 L40 44 L46 56 L54 42 L60 56 L70 50 L60 60 L50 52 L40 62 Z"
        fill="#000000"
        stroke="#8b5cf6"
        strokeWidth="1.5"
      />
      {[42, 50, 58].map((x, i) => (
        <polygon
          key={x}
          points={`${x - 3},${30 + i * 2} ${x},${20 + i * 2} ${x + 3},${30 + i * 2}`}
          fill="#f87171"
          opacity={0.9 - i * 0.25}
        />
      ))}
      <path d="M50 22 Q46 34 50 46" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="2 2" />
    </g>
  ),
  // One shape of shadow mirrored into two.
  voidEcho: (
    <g>
      {[34, 66].map((x, i) => (
        <g key={x} opacity={i ? 0.55 : 1}>
          <circle cx={x} cy="36" r="15" fill="#000000" stroke="#c4b5fd" strokeWidth="2" />
          <path d={`M${x - 7} 40 L${x} 28 L${x + 7} 40 Z`} fill="#a78bfa" />
        </g>
      ))}
      <path d="M48 36 L52 36" stroke="#ede9fe" strokeWidth="2" strokeDasharray="1 2" />
    </g>
  ),
  // Shadow hands reaching from a rift to pull someone back.
  riftCall: (
    <g>
      <ellipse cx="30" cy="54" rx="18" ry="6" fill="#000000" stroke="#8b5cf6" strokeWidth="1.5" />
      <path d="M30 54 Q40 30 66 30" fill="none" stroke="#1e1b4b" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 54 Q40 30 66 30" fill="none" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="74" cy="26" r="6" fill="#e5e7eb" />
      <path d="M68 50 Q74 32 80 50 Z" fill="#e5e7eb" />
      <path d="M60 30 L68 26 M62 34 L69 30" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
};
