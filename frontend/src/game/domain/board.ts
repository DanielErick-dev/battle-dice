import type { Board, Tile, TileEffect, TileId } from "./types";

export interface BoardDefinition {
  size: number;
  effects: Readonly<Record<TileId, TileEffect>>;
}

export const CLASSIC_BOARD: BoardDefinition = {
  size: 20,
  effects: {
    5: { kind: "portal", to: 10 },
    8: { kind: "trap", to: 6 },
    15: { kind: "portal", to: 19 },
    18: { kind: "trap", to: 17 },
  },
};

export const TOURNAMENT_BOARD: BoardDefinition = {
  size: 30,
  effects: {
    4: { kind: "portal", to: 11 },
    9: { kind: "trap", to: 3 },
    13: { kind: "portal", to: 20 },
    17: { kind: "trap", to: 14 },
    22: { kind: "portal", to: 27 },
    26: { kind: "trap", to: 19 },
    29: { kind: "trap", to: 24 },
  },
};

export const TIME_CHAMBER_BOARD: BoardDefinition = {
  size: 42,
  effects: {
    3: { kind: "portal", to: 10 },
    8: { kind: "trap", to: 2 },
    12: { kind: "portal", to: 19 },
    16: { kind: "trap", to: 6 },
    21: { kind: "portal", to: 30 },
    25: { kind: "trap", to: 17 },
    29: { kind: "trap", to: 23 },
    33: { kind: "portal", to: 38 },
    36: { kind: "trap", to: 27 },
    40: { kind: "trap", to: 31 },
    41: { kind: "trap", to: 34 },
  },
};

export function createBoard({ size, effects }: BoardDefinition): Board {
  const startTile = 1;
  const finishTile = size;

  const tiles: Tile[] = Array.from({ length: size }, (_, index) => {
    const id = index + 1;
    return {
      id,
      role: id === startTile ? "start" : id === finishTile ? "finish" : "regular",
      effect: effects[id] ?? { kind: "none" },
    };
  });

  return { tiles, startTile, finishTile };
}

export function getTile(board: Board, id: TileId): Tile {
  const tile = board.tiles[id - 1];
  if (!tile) throw new RangeError(`Tile ${id} is outside the board`);
  return tile;
}
