"use client";

import { Html } from "@react-three/drei";
import type { TileTheme } from "./theme/tileTheme";

/** What the stone does, in a tag above it while the pointer is over it. */
export function TileTag({ theme }: { theme: TileTheme }) {
  return (
    <Html center position-y={1.5} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div
        className="rounded-lg bg-black/80 px-2.5 py-1 text-center whitespace-nowrap ring-1 ring-white/15"
        style={{ boxShadow: `0 0 14px ${theme.glow}66` }}
      >
        <div className="text-xs font-black tracking-wide text-white italic">{theme.label}</div>
        {theme.caption && (
          <div className="text-[10px] font-bold" style={{ color: theme.glow }}>
            {theme.caption}
          </div>
        )}
      </div>
    </Html>
  );
}
