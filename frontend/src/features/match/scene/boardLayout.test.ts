import { describe, expect, it } from "vitest";
import { createBoard, POWER_TOURNAMENT_BOARD, TRAINING_BOARD } from "@/game/domain/board";
import { createBoardLayout, TILE_PITCH, TILE_SIZE } from "./boardLayout";

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
