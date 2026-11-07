import type { ReactNode } from "react";

/** Zarek's own. */
export const zarekArt: Record<"voidHunger" | "hungryRift" | "voidEcho" | "riftCall", ReactNode> = {
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
