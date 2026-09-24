"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import type { Board } from "@/game/domain/types";
import { TILE_HEIGHT, type BoardLayout, type Vec3 } from "./boardLayout";
import { themeFor } from "./tileTheme";

/** Arcs from each portal/trap to its destination, so the rules are readable at a glance. */
interface TileLinksProps {
  board: Board;
  layout: BoardLayout;
  /** Tile whose effect is playing right now; its arc lights up. */
  activeFrom: number | null;
}

export function TileLinks({ board, layout, activeFrom }: TileLinksProps) {
  return (
    <>
      {board.tiles.map((tile) => {
        if (tile.effect.kind !== "portal" && tile.effect.kind !== "trap") return null;

        const start = lift(layout.position(tile.id));
        const end = lift(layout.position(tile.effect.to));
        const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
        const mid: Vec3 = [(start[0] + end[0]) / 2, 1.2 + length * 0.35, (start[2] + end[2]) / 2];
        const active = tile.id === activeFrom;

        return (
          <QuadraticBezierLine
            key={tile.id}
            start={start}
            end={end}
            mid={mid}
            color={themeFor(tile).glow}
            lineWidth={active ? 3.5 : 1.5}
            dashed
            dashScale={6}
            transparent
            opacity={active ? 0.95 : 0.22}
          />
        );
      })}
    </>
  );
}

function lift([x, , z]: Vec3): Vec3 {
  return [x, TILE_HEIGHT / 2 + 0.1, z];
}
