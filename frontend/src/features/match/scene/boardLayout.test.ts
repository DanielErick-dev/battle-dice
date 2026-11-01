import { describe, expect, it } from "vitest";
import { createBoard } from "@/game/domain/board/board";
import { POWER_TOURNAMENT_BOARD, TRAINING_BOARD } from "@/game/domain/board/presets";
import { createBoardLayout, startSlot, TILE_PITCH, TILE_SIZE } from "./boardLayout";

describe("the winding trail", () => {
  for (const [name, definition, columns] of [
    ["training", TRAINING_BOARD, 5],
    ["power tournament", POWER_TOURNAMENT_BOARD, 20],
  ] as const) {
    it(`lays every main tile of the ${name} board a step apart, never on top of another`, () => {
      const board = createBoard(definition);
      const layout = createBoardLayout(board, columns);
      expect(layout.trail).toHaveLength(board.finishTile);
      layout.trail.forEach(([x, , z], index) => {
        expect(layout.position(index + 1)).toEqual([x, 0, z]);
        if (index === 0) return;
        const [px, , pz] = layout.trail[index - 1];
        expect(Math.hypot(x - px, z - pz)).toBeCloseTo(TILE_PITCH, 0);
        for (let other = 0; other < index - 1; other++) {
          const [ox, , oz] = layout.trail[other];
          expect(Math.hypot(x - ox, z - oz), `${index + 1} vs ${other + 1}`).toBeGreaterThan(TILE_SIZE);
        }
      });
    });
  }
});

describe("the start plaza", () => {
  it("lines the players up side by side in turn order, none ahead of another", () => {
    const slots = [0, 1, 2, 3].map((slot) => startSlot(slot, 4));
    expect(new Set(slots.map(([along]) => along)).size).toBe(1);
    const across = slots.map(([, side]) => side);
    expect(across).toEqual([...across].sort((a, b) => b - a));
    expect(across[0]).toBeCloseTo(-across[3]);
  });

  it("starts a second row further back past four players", () => {
    const [frontAlong] = startSlot(0, 6);
    const [backAlong, backAcross] = startSlot(4, 6);
    expect(backAlong).toBeLessThan(frontAlong);
    expect(backAcross).toBeGreaterThan(0);
  });
});
