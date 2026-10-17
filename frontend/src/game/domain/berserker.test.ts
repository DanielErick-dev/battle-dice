import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  LONG_ABILITY_CYCLE,
  TRAMPLE_PUSH,
  UNTAMED_TURNS,
  abilityCycle,
  type AbilityId,
} from "./abilities";
import type { BoardDefinition } from "./board";
import type { GameCommand } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import type { GameEvent } from "./events";
import { seededRandom } from "./random";
import type { GameState, Player } from "./types";

/** A trap at 12 back to 8, a curse at 15 and a lost turn at 18; everything else plain. */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    12: { kind: "trap", to: 8 },
    15: { kind: "curse", curse: "drain" },
    18: { kind: "skipTurn" },
  },
};

const game = (rivalAbility: AbilityId = "studySession") =>
  createGame(
    BOARD,
    [
      { id: "wolf", name: "Wolf", ability: "untamed" },
      { id: "rival", name: "Rival", ability: rivalAbility },
      { id: "third", name: "Third", ability: "studySession" },
    ],
    { random: seededRandom(7) },
  );
function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)),
  };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, {
    rollDice: sequenceDice(dice),
    random: seededRandom(3),
  });
const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;
const roll = (state: GameState, playerId: string, die: number) => send(state, { type: "rollDice", playerId }, [die]);
const unleashed = (state: GameState) =>
  send(patch(state, "wolf", { abilityCharge: abilityCycle("untamed") }), {
    type: "activateAbility",
    playerId: "wolf",
  }).state;
const moves = (events: readonly GameEvent[]) =>
  events.flatMap((event) => (event.type === "playerMoved" ? [event.path] : []));

describe("the Berserker's trample", () => {
  it(`knocks every opponent walked through back ${TRAMPLE_PUSH} tiles, as he reaches them`, () => {
    const start = patch(patch(patch(game(), "wolf", { position: 20 }), "rival", { position: 22 }), "third", {
      position: 24,
    });
    const { state, events } = roll(start, "wolf", 5);
    expect(player(state, "rival").position).toBe(22 - TRAMPLE_PUSH);
    expect(player(state, "third").position).toBe(24 - TRAMPLE_PUSH);
    expect(player(state, "wolf").position).toBe(25);
    expect(moves(events)).toEqual([[21, 22], [23, 24], [25]]);
    const trampled = events.filter((event) => event.type === "playerTrampled");
    expect(trampled).toEqual([
      expect.objectContaining({ playerId: "rival", by: "wolf", tile: 22 }),
      expect.objectContaining({ playerId: "third", by: "wolf", tile: 24 }),
    ]);
    expect(events.indexOf(trampled[0])).toBe(events.findIndex((event) => event.type === "playerMoved") + 1);
  });

  it("knocks back the one he stops on too, but not those on the tile he leaves", () => {
    const start = patch(patch(patch(game(), "wolf", { position: 20 }), "rival", { position: 23 }), "third", {
      position: 20,
    });
    const { state } = roll(start, "wolf", 3);
    expect(player(state, "rival").position).toBe(23 - TRAMPLE_PUSH);
    expect(player(state, "third").position).toBe(20);
  });

  it("doesn't trample walking backwards", () => {
    const start = patch(patch(game(), "wolf", { position: 30, reversedRolls: 1 }), "rival", { position: 28 });
    const { state, events } = roll(start, "wolf", 2);
    expect(player(state, "wolf").position).toBe(28);
    expect(player(state, "rival").position).toBe(28);
    expect(events.some((event) => event.type === "playerTrampled")).toBe(false);
  });

  it("Spectral Armour keeps the trample off", () => {
    const start = patch(patch(game(), "wolf", { position: 20 }), "rival", {
      position: 22,
      spectralArmour: ARMOUR_TURNS,
    });
    expect(player(roll(start, "wolf", 4).state, "rival").position).toBe(22);
  });

  it("only the Berserker tramples", () => {
    const start = patch(patch(game(), "wolf", { position: 20 }), "rival", {
      position: 22,
    });
    const { state } = roll(start, "wolf", 1);
    expect(player(roll(state, "rival", 1).state, "wolf").position).toBe(21);
  });
});

describe("Untamed", () => {
  it("takes the long cycle", () => {
    expect(abilityCycle("untamed")).toBe(LONG_ABILITY_CYCLE);
  });

  it("shrugs off traps, curses and lost turns, and keeps blessings", () => {
    let state = patch(unleashed(game()), "wolf", { position: 9 });
    state = roll(state, "wolf", 3).state;
    expect(player(state, "wolf").position).toBe(12);
    state = patch(roll(roll(state, "rival", 1).state, "third", 1).state, "wolf", { position: 13, energy: 5 });
    const cursed = roll(state, "wolf", 2);
    expect(player(cursed.state, "wolf").energy).toBe(5);
    expect(cursed.events).toContainEqual(
      expect.objectContaining({
        type: "trapBlocked",
        ward: "untamed",
        tile: 15,
      }),
    );
    state = patch(roll(roll(cursed.state, "rival", 1).state, "third", 1).state, "wolf", { position: 16 });
    const lost = roll(state, "wolf", 2).state;
    expect(player(lost, "wolf").skipTurns).toBe(0);
  });

  it("springs a hidden trap without being touched; it moves on", () => {
    const state = {
      ...patch(unleashed(game()), "wolf", { position: 30 }),
      hiddenTraps: [33],
    };
    const { state: after, events } = roll(state, "wolf", 3);
    expect(player(after, "wolf").position).toBe(33);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "trapBlocked",
        ward: "untamed",
        hidden: true,
      }),
    );
  });

  it("can't keep Cronos's Time Warp off: time isn't a blow", () => {
    const state = patch(patch(unleashed(game("timeWarp")), "wolf", { position: 30 }), "rival", { position: 10 });
    const next = roll(state, "wolf", 1).state;
    expect(() =>
      send(patch(next, "rival", { abilityCharge: abilityCycle("timeWarp") }), {
        type: "activateAbility",
        playerId: "rival",
        power: "halt",
        targetId: "wolf",
      }),
    ).not.toThrow();
  });

  it(`lasts ${UNTAMED_TURNS} of his turns, and only charges again once it's over`, () => {
    let state = unleashed(game());
    expect(player(state, "wolf")).toMatchObject({
      untamed: UNTAMED_TURNS,
      abilityCharge: 0,
    });
    const round = (current: GameState) =>
      roll(roll(roll(current, "wolf", 1).state, "rival", 1).state, "third", 1).state;
    for (let turn = 1; turn < UNTAMED_TURNS; turn++) {
      state = round(state);
      expect(player(state, "wolf")).toMatchObject({
        untamed: UNTAMED_TURNS - turn,
        abilityCharge: 0,
      });
    }
    state = round(state);
    expect(player(state, "wolf")).toMatchObject({
      untamed: 0,
      abilityCharge: 1,
    });
  });
});
