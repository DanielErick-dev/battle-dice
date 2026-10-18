import { describe, expect, it } from "vitest";
import { createBoard, type BoardDefinition } from "./board";
import { HIDDEN_TRAP_PUSH, placeHiddenTraps, relocateHiddenTrap } from "./hiddenTraps";
import { seededRandom } from "./random";
import { hasEvent, newGame, roll, withPlayer } from "./testing";
import type { Player, TileId } from "./types";

const BOARD: BoardDefinition = {
  size: 40,
  effects: { 14: { kind: "card" } },
  trapZones: [{ from: 10, to: 19, traps: 2 }],
};

/** Aria at the start, with `patch` and the hidden traps on `hiddenTraps`. */
const game = (patch: Partial<Player>, hiddenTraps: TileId[]) => ({
  ...withPlayer(newGame(BOARD, { p1: null }), "p1", patch),
  hiddenTraps,
});

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
    const { state, events } = roll(game({ position: 9 }, [12, 16]), "p1", 3);
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
    const { state, events } = roll(game({ position: 9, shielded: true }, [12, 16]), "p1", 3);
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
    const { state, events } = roll(game({ position: 9 }, [12, 16]), "p1", 4);
    expect(hasEvent(events, "hiddenTrapSprung")).toBe(false);
    expect(state.hiddenTraps).toEqual([12, 16]);
  });
});
