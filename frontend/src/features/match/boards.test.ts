import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board";
import { BOARD_PRESETS } from "./boards";

describe.each(BOARD_PRESETS)("board preset $name", ({ definition }) => {
  const board = createBoard(definition);
  const effectTiles = board.tiles.filter((tile) => tile.effect.kind !== "none");

  it("keeps start and finish free of effects", () => {
    expect(board.tiles[0].effect.kind).toBe("none");
    expect(board.tiles.at(-1)?.effect.kind).toBe("none");
  });

  it("sends portals forward and traps backward, to plain tiles inside the board", () => {
    for (const tile of effectTiles) {
      if (tile.effect.kind === "none") continue;
      const { to } = tile.effect;
      expect(to).toBeGreaterThan(board.startTile);
      expect(to).toBeLessThan(board.finishTile);
      expect(board.tiles[to - 1].effect.kind).toBe("none");
      if (tile.effect.kind === "portal") expect(to).toBeGreaterThan(tile.id);
      else expect(to).toBeLessThan(tile.id);
    }
  });
});
