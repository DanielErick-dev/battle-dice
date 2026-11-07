import type { ReactNode } from "react";

/** Heaven's relics. */
export const divineArt: Record<"celestialLight" | "heavenlyAegis" | "ascension", ReactNode> = {
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
};
