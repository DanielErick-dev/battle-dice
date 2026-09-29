import { describe, expect, it } from "vitest";
import { createBoard, type BoardDefinition } from "./board";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { HIDDEN_TRAP_PUSH, placeHiddenTraps, relocateHiddenTrap } from "./hiddenTraps";
import { seededRandom } from "./random";
import type { GameState, Player } from "./types";

const BOARD: BoardDefinition = {
  size: 40,
  effects: { 14: { kind: "card" } },
  trapZones: [{ from: 10, to: 19, traps: 2 }],
};

const game = () => createGame(BOARD, [{ id: "p1", name: "Aria" }], { random: seededRandom(7) });

function with1(state: GameState, patch: Partial<Player>, hiddenTraps = state.hiddenTraps): GameState {
  return {
    ...state,
    hiddenTraps,
    players: state.players.map((player) => ({ ...player, ...patch })),
  };
}

const roll = (state: GameState, ...dice: number[]) =>
  applyCommand(state, { type: "rollDice", playerId: "p1" }, { rollDice: sequenceDice(dice), random: seededRandom(3) });

describe("hidden traps", () => {
  const board = createBoard(BOARD);

  it("sit on the zone's plain tiles, as many as asked", () => {
    expect(board.trapZones[0].tiles).toEqual([10, 11, 12, 13, 15, 16, 17, 18, 19]);
    const traps = placeHiddenTraps(board, seededRandom(1));
    expect(traps).toHaveLength(2);
    expect(new Set(traps).size).toBe(2);
    for (const trap of traps) expect(board.trapZones[0].tiles).toContain(trap);
  });

  it("move to another free tile of the zone once found", () => {
    const moved = relocateHiddenTrap(board, [12, 16], 12, seededRandom(5));
    expect(moved).toHaveLength(2);
    expect(moved).toContain(16);
    expect(moved).not.toContain(12);
    expect(board.trapZones[0].tiles).toContain(moved[0]);
  });

  it("throw the player back and move away when landed on", () => {
    const { state, events } = roll(with1(game(), { position: 9 }, [12, 16]), 3);
    expect(events).toContainEqual({
      type: "hiddenTrapSprung",
      playerId: "p1",
      tile: 12,
      to: 12 - HIDDEN_TRAP_PUSH,
    });
    expect(state.players[0].position).toBe(12 - HIDDEN_TRAP_PUSH);
    expect(state.hiddenTraps).not.toContain(12);
    expect(state.hiddenTraps).toContain(16);
  });

  it("are blocked by the Arcane Shield, and still move", () => {
    const { state, events } = roll(with1(game(), { position: 9, shielded: true }, [12, 16]), 3);
    expect(events).toContainEqual({
      type: "trapBlocked",
      playerId: "p1",
      tile: 12,
      ward: "shield",
      hidden: true,
    });
    expect(state.players[0]).toMatchObject({ position: 12, shielded: false });
    expect(state.hiddenTraps).not.toContain(12);
  });

  it("stay put when only walked over", () => {
    const { state, events } = roll(with1(game(), { position: 9 }, [12, 16]), 4);
    expect(events.some((event) => event.type === "hiddenTrapSprung")).toBe(false);
    expect(state.hiddenTraps).toEqual([12, 16]);
  });
});
