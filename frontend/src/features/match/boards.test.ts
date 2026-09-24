import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board";
import { BOARD_PRESETS } from "./boards";

describe.each(BOARD_PRESETS)("board preset $name", ({ definition }) => {
  const board = createBoard(definition);

  it("keeps start and finish free of effects", () => {
    expect(board.tiles[0].effect.kind).toBe("none");
    expect(board.tiles.at(-1)?.effect.kind).toBe("none");
  });

  it("sends portals and advances forward and traps backward, to plain tiles inside the board", () => {
    for (const { id, effect } of board.tiles) {
      if (effect.kind !== "portal" && effect.kind !== "trap" && effect.kind !== "advance") continue;
      const { to } = effect;
      expect(to).toBeGreaterThan(board.startTile);
      expect(to).toBeLessThan(board.finishTile);
      expect(board.tiles[to - 1].effect.kind, `tile ${id} → ${to}`).toBe("none");
      if (effect.kind === "trap") expect(to).toBeLessThan(id);
      else expect(to).toBeGreaterThan(id);
    }
  });
});
