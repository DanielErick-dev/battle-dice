import { describe, expect, it } from "vitest";
import { createBoard, getTile } from "@/game/domain/board";
import { BOARD_PRESETS } from "./boards";

describe.each(BOARD_PRESETS)("board preset $name", ({ definition }) => {
  const board = createBoard(definition);

  it("keeps start and finish free of effects", () => {
    expect(getTile(board, board.startTile).effect.kind).toBe("none");
    expect(getTile(board, board.finishTile).effect.kind).toBe("none");
  });

  it("sends portals and advances forward and traps backward, to plain tiles inside the board", () => {
    for (const { id, effect, track } of board.tiles) {
      if (track) continue;
      if (effect.kind !== "portal" && effect.kind !== "trap" && effect.kind !== "advance") continue;
      const { to } = effect;
      expect(to).toBeGreaterThan(board.startTile);
      expect(to).toBeLessThan(board.finishTile);
      expect(board.tiles[to - 1].effect.kind, `tile ${id} → ${to}`).toBe("none");
      if (effect.kind === "trap") expect(to).toBeLessThan(id);
      else expect(to).toBeGreaterThan(id);
    }
  });

  it("keeps trap zones on plain tiles of the main path", () => {
    for (const zone of board.trapZones) {
      expect(zone.tiles.length).toBeGreaterThan(zone.traps);
      for (const id of zone.tiles) expect(getTile(board, id)).toMatchObject({ role: "regular", effect: { kind: "none" } });
    }
  });
});
