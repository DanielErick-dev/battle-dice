import type { ReactNode } from "react";

type AlvaCard = "malwareInjection" | "overloadThruster" | "firewallLock" | "dataCollapse" | "apocalypseProtocol";

/** Unidade Alva's own (fallbacks until the painted art arrives). */
export const alvaArt: Record<AlvaCard, ReactNode> = {
  // Two glitched green cards sliding into a hand.
  malwareInjection: (
    <g>
      <rect x="28" y="22" width="20" height="28" rx="2" fill="#365314" stroke="#a3e635" strokeWidth="2" />
      <rect x="50" y="28" width="20" height="28" rx="2" fill="#365314" stroke="#a3e635" strokeWidth="2" />
      <path d="M32 32 H44 M54 40 H66 M34 40 H40 M56 48 H62" stroke="#d9f99d" strokeWidth="2" />
    </g>
  ),
  // A thruster flame under a chevron.
  overloadThruster: (
    <g>
      <path d="M50 16 L66 40 L50 34 L34 40 Z" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="2" />
      <path d="M42 42 Q50 66 58 42 Z" fill="#38bdf8" />
      <path d="M46 42 Q50 56 54 42 Z" fill="#e0f2fe" />
    </g>
  ),
  // A padlock behind a brick firewall.
  firewallLock: (
    <g>
      <rect x="22" y="38" width="56" height="22" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2" />
      <path d="M22 49 H78 M36 38 V49 M50 49 V60 M64 38 V49" stroke="#38bdf8" strokeWidth="1.5" />
      <rect x="40" y="22" width="20" height="16" rx="2" fill="#e2e8f0" />
      <path d="M44 22 V16 Q50 8 56 16 V22" fill="none" stroke="#e2e8f0" strokeWidth="3" />
    </g>
  ),
  // Cards falling into a violet well.
  dataCollapse: (
    <g>
      <ellipse cx="50" cy="56" rx="26" ry="7" fill="#4c1d95" />
      <ellipse cx="50" cy="56" rx="14" ry="3.5" fill="#1e1b4b" />
      <rect x="40" y="18" width="12" height="17" rx="1.5" fill="#c4b5fd" transform="rotate(-20 46 26)" />
      <rect x="52" y="28" width="12" height="17" rx="1.5" fill="#a78bfa" transform="rotate(15 58 36)" />
    </g>
  ),
  // A red core bursting with a skull-like visor.
  apocalypseProtocol: (
    <g>
      <circle cx="50" cy="38" r="20" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
      <rect x="38" y="32" width="24" height="6" rx="3" fill="#fca5a5" />
      <path d="M50 10 V18 M50 58 V66 M22 38 H30 M70 38 H78" stroke="#f87171" strokeWidth="3" />
    </g>
  ),
};
