import type { Player, TileId } from "@/game/domain/types";

export type Vec3 = [number, number, number];

export const TILE_SIZE = 1.8;
export const TILE_HEIGHT = 0.32;
const TILE_GAP = 0.45;
export const TILE_PITCH = TILE_SIZE + TILE_GAP;

export interface BoardLayout {
  columns: number;
  rows: number;
  /** Extent of the tile grid, edge to edge. */
  width: number;
  depth: number;
  position: (id: TileId) => Vec3;
}

/**
 * Snake layout read like a page: the start sits on the far (top) row and the path
 * zig-zags towards the camera, so the finish is on the near (bottom) row.
 */
export function createBoardLayout(totalTiles: number, columns: number): BoardLayout {
  const rows = Math.ceil(totalTiles / columns);

  return {
    columns,
    rows,
    width: columns * TILE_PITCH - TILE_GAP,
    depth: rows * TILE_PITCH - TILE_GAP,
    position: (id) => {
      const index = id - 1;
      const row = Math.floor(index / columns);
      const column = row % 2 === 0 ? index % columns : columns - 1 - (index % columns);
      return [(column - (columns - 1) / 2) * TILE_PITCH, 0, (row - (rows - 1) / 2) * TILE_PITCH];
    },
  };
}

/** Offsets tokens that share a tile so they don't overlap. */
export function tileOffsetFor(player: Player, players: readonly Player[]): Vec3 {
  const occupants = players.filter((other) => other.position === player.position);
  if (occupants.length <= 1) return [0, 0, 0];

  const slot = occupants.findIndex((other) => other.id === player.id);
  const angle = (slot / occupants.length) * Math.PI * 2;
  const radius = TILE_SIZE * 0.22;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}
