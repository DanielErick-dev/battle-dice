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
    6: { kind: "advance", to: 8 },
    9: { kind: "trap", to: 3 },
    13: { kind: "portal", to: 20 },
    15: { kind: "extraTurn" },
    17: { kind: "trap", to: 14 },
    22: { kind: "portal", to: 27 },
    23: { kind: "skipTurn" },
    26: { kind: "trap", to: 19 },
    29: { kind: "trap", to: 24 },
  },
};

export const TIME_CHAMBER_BOARD: BoardDefinition = {
  size: 42,
  effects: {
    3: { kind: "portal", to: 10 },
    5: { kind: "advance", to: 7 },
    8: { kind: "trap", to: 2 },
    12: { kind: "portal", to: 19 },
    14: { kind: "extraTurn" },
    16: { kind: "trap", to: 6 },
    18: { kind: "skipTurn" },
    21: { kind: "portal", to: 30 },
    25: { kind: "trap", to: 17 },
    29: { kind: "trap", to: 23 },
    33: { kind: "portal", to: 38 },
    35: { kind: "advance", to: 37 },
    36: { kind: "trap", to: 27 },
    40: { kind: "trap", to: 31 },
    41: { kind: "trap", to: 34 },
  },
};

const POWER_TOURNAMENT_PORTALS = { 4: 14, 18: 37, 29: 44, 50: 66, 62: 75, 73: 86 };
const POWER_TOURNAMENT_TRAPS = { 16: 6, 33: 19, 48: 26, 57: 40, 64: 51, 79: 58, 87: 69, 93: 72, 98: 78 };
const POWER_TOURNAMENT_ADVANCES = { 8: 11, 23: 27, 36: 41, 52: 56, 67: 70, 76: 81, 84: 88, 95: 97 };

export const POWER_TOURNAMENT_BOARD: BoardDefinition = {
  size: 100,
  effects: {
    ...jumps("portal", POWER_TOURNAMENT_PORTALS),
    ...jumps("trap", POWER_TOURNAMENT_TRAPS),
    ...jumps("advance", POWER_TOURNAMENT_ADVANCES),
    ...Object.fromEntries([12, 31, 46, 61, 83].map((id) => [id, { kind: "extraTurn" } as const])),
    ...Object.fromEntries([20, 39, 59, 77, 91].map((id) => [id, { kind: "skipTurn" } as const])),
  },
};

function jumps(kind: "portal" | "trap" | "advance", map: Record<number, TileId>): Record<TileId, TileEffect> {
  return Object.fromEntries(Object.entries(map).map(([from, to]) => [Number(from), { kind, to }]));
}

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
