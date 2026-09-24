export type PlayerId = string;
export type TileId = number;

export type TileEffect =
  | { kind: "none" }
  | { kind: "portal"; to: TileId }
  | { kind: "trap"; to: TileId };

export type TileRole = "start" | "finish" | "regular";

export interface Tile {
  id: TileId;
  role: TileRole;
  effect: TileEffect;
}

export interface Board {
  tiles: readonly Tile[];
  startTile: TileId;
  finishTile: TileId;
}

export interface Player {
  id: PlayerId;
  name: string;
  position: TileId;
}

export type GameStatus = "playing" | "finished";

export interface GameState {
  board: Board;
  players: readonly Player[];
  currentPlayerIndex: number;
  status: GameStatus;
  winnerId: PlayerId | null;
  turn: number;
}
