"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import type { Board } from "@/game/domain/types";
import { TILE_HEIGHT, type BoardLayout, type Vec3 } from "./boardLayout";
import { themeFor } from "./tileTheme";

/**
 * The arc from a portal or trap to its destination, shown only while that tile's effect plays, so
 * the board stays clean the rest of the time.
 */
interface TileLinksProps {
  board: Board;
  layout: BoardLayout;
  /** Tile whose effect is playing right now: the only one whose arc shows. */
  activeFrom: number | null;
}

export function TileLinks({ board, layout, activeFrom }: TileLinksProps) {
  const tile = activeFrom === null ? undefined : board.tiles.find((candidate) => candidate.id === activeFrom);
  if (!tile || (tile.effect.kind !== "portal" && tile.effect.kind !== "trap")) return null;
  // Realm portals show their track instead, and only while it's open.
  if (tile.effect.kind === "portal" && tile.effect.realm) return null;

  const start = lift(layout.position(tile.id));
  const end = lift(layout.position(tile.effect.to));
  const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
  const mid: Vec3 = [(start[0] + end[0]) / 2, 1.2 + length * 0.35, (start[2] + end[2]) / 2];

  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={mid}
      color={themeFor(tile).glow}
      lineWidth={3.5}
      dashed
      dashScale={6}
      transparent
      opacity={0.95}
    />
  );
}

function lift([x, , z]: Vec3): Vec3 {
  return [x, TILE_HEIGHT / 2 + 0.1, z];
}
