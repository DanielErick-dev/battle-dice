import { generateBoard } from "./boardGenerator";
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

/** The classic board plus card tiles: what the "Treino" preset plays on. */
export const TRAINING_BOARD: BoardDefinition = {
  ...CLASSIC_BOARD,
  effects: { ...CLASSIC_BOARD.effects, ...cards([3, 12]) },
};

/** 200 tiles laid out by the generator; the fixed seed keeps it identical for everyone. */
export const POWER_TOURNAMENT_BOARD: BoardDefinition = generateBoard({
  size: 200,
  seed: 2026,
  density: { portal: 6, trap: 9, advance: 8, extraTurn: 4, skipTurn: 4, card: 12 },
});

function cards(tiles: readonly TileId[]): Record<TileId, TileEffect> {
  return Object.fromEntries(tiles.map((id) => [id, { kind: "card" } as const]));
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
