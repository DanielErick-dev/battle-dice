import type { TileTheme } from "../theme/tileTheme";

/** Logical drawing size; the canvas itself may be smaller (see TileFace.resolution). */
export const SIZE = 512;
export const FONT = "system-ui, sans-serif";

export interface TileFace {
  tileId: number;
  theme: TileTheme;
  /** Path colour at this tile, used for the medallion ring and the arrows. */
  accent: string;
  /** Direction to the next tile in canvas space (0 = right, π/2 = down), or null on the last tile. */
  arrowAngle: number | null;
  /** Texture size in pixels. Big boards use less to keep GPU memory in check. */
  resolution: number;
  /** Only the rune and the number on a clear face, floated over a modelled slab (see PathSlab). */
  bare?: boolean;
  /** Leave the rune out (a 3D ornament already says what the tile does): the number alone. */
  runeless?: boolean;
  /** Leave the number out (shown on its own plaque, see TileNumber). */
  numberless?: boolean;
}

export const CENTER = SIZE / 2;
/** The engraved rune's reach from the middle. */
export const RUNE = 120;
