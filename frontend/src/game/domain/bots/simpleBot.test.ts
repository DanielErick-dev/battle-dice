import { describe, expect, it } from "vitest";
import { applyCommand, createGame } from "../core/engine";
import { botMove } from "./simpleBot";
import type { GameState } from "../core/state";

const players = [
  { id: "a", name: "A", ability: "fourElements" as const },
  { id: "b", name: "B", ability: "arrowRain" as const },
  { id: "c", name: "C", ability: "theVoid" as const },
];

describe("simple bot", () => {
  it("only moves on its own turn", () => {
    const state = createGame({ size: 60, effects: {} }, players, { seed: 3 });
    expect(botMove(state, "b")).toBeNull();
    expect(botMove(state, "a")).not.toBeNull();
  });

  it("plays whole matches against itself without ever sending an illegal command", () => {
    for (const seed of [1, 2, 3]) {
      let state: GameState = createGame({ size: 60, effects: { 12: { kind: "trap", to: 5 } } }, players, {
        seed,
        chargedAbilities: true,
      });
      for (let move = 0; move < 2000 && state.status !== "finished"; move++) {
        const command = state.players.map((player) => botMove(state, player.id)).find((next) => next !== null);
        expect(command).toBeDefined();
        if (!command) break;
        state = applyCommand(state, command).state;
      }
      expect(state.status).toBe("finished");
    }
  });
});
