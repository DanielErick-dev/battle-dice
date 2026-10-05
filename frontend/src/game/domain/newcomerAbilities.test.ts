import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  GLACIAL_SOLO_BONUS,
  PLASMA_PUSH,
  TIDE_RANGE,
  TIME_ROUNDS,
  STUDY_DRAWS,
  abilityCycle,
  LONG_ABILITY_CYCLE,
  type AbilityId,
} from "./abilities";
import type { BoardDefinition } from "./board";
import type { GameCommand } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { GameState, Player } from "./types";

/** Traps at 12 and 20, a curse at 15; everything else plain. */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    12: { kind: "trap", to: 8 },
    15: { kind: "curse", curse: "drain" },
    20: { kind: "trap", to: 16 },
  },
};

const duel = (ability: AbilityId) =>
  createGame(
    BOARD,
    [
      { id: "hero", name: "Hero", ability },
      { id: "rival", name: "Rival", ability: "studySession" },
    ],
    { random: seededRandom(7) },
  );
const solo = (ability: AbilityId) =>
  createGame(BOARD, [{ id: "hero", name: "Hero", ability }], { random: seededRandom(7) });
function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)) };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;
const ready = (state: GameState) =>
  patch(state, "hero", { abilityCharge: abilityCycle(player(state, "hero").ability) });
const activate = (state: GameState, extra: Partial<Extract<GameCommand, { type: "activateAbility" }>> = {}) =>
  send(ready(state), { type: "activateAbility", playerId: "hero", ...extra });
const roll = (state: GameState, die: number) => send(state, { type: "rollDice", playerId: "hero" }, [die]);

describe("the newcomers' abilities", () => {
  it("Study Session draws cards", () => {
    const { state } = activate(patch(duel("studySession"), "hero", { hand: [] }));
    expect(player(state, "hero").hand).toHaveLength(STUDY_DRAWS);
  });

  it("Seraph's Blessing lays one of heaven's blessings on the player", () => {
    const { state, events } = activate(duel("seraphBlessing"));
    expect(player(state, "hero").blessings).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({ type: "blessingReceived", playerId: "hero" }));
  });

  it(`Cleansing Tide washes every spell off the ${TIDE_RANGE} tiles ahead, and only those`, () => {
    const spelled: GameState = {
      ...patch(duel("cleansingTide"), "hero", { position: 10 }),
      blackFlames: [
        { tile: 24, owner: "rival", turnsLeft: 5, hits: 0 },
        { tile: 10 + TIDE_RANGE + 1, owner: "rival", turnsLeft: 5, hits: 0 },
      ],
      enchantedTiles: [{ tile: 12, owner: "rival" }],
      pinnedTraps: [20],
    };
    const { state, events } = activate(spelled);
    expect(state).toMatchObject({ enchantedTiles: [], pinnedTraps: [] });
    expect(state.blackFlames.map((flame) => flame.tile)).toEqual([10 + TIDE_RANGE + 1]);
    expect(events).toContainEqual(expect.objectContaining({ type: "boardCleansed", tiles: [24, 12, 20] }));
  });

  it("Glacial Howl freezes the opponents in reach; alone, the roll walks further", () => {
    const { state } = activate(duel("glacialHowl"));
    expect(player(state, "rival").skipTurns).toBe(1);
    const alone = roll(activate(solo("glacialHowl")).state, 2).state;
    expect(player(alone, "hero").position).toBe(1 + 2 + GLACIAL_SOLO_BONUS);
  });

  it("Sacred Bulwark raises the shield and Spectral Armour", () => {
    const { state } = activate(duel("sacredBulwark"));
    expect(player(state, "hero")).toMatchObject({ shielded: true, spectralArmour: ARMOUR_TURNS });
  });

  it(`Time Warp halts an opponent for ${TIME_ROUNDS} rounds`, () => {
    const { state } = activate(duel("timeWarp"), { power: "halt", targetId: "rival" });
    expect(player(state, "rival").skipTurns).toBe(TIME_ROUNDS);
    expect(() => activate(duel("timeWarp"), { power: "halt" })).toThrow();
  });

  it(`Time Warp reverses an opponent's next ${TIME_ROUNDS} rolls`, () => {
    let state = activate(patch(duel("timeWarp"), "rival", { position: 30 }), {
      power: "reverse",
      targetId: "rival",
    }).state;
    state = roll(state, 1).state;
    const back = send(state, { type: "rollDice", playerId: "rival" }, [4]);
    expect(player(back.state, "rival")).toMatchObject({ position: 26, reversedRolls: TIME_ROUNDS - 1 });
    expect(back.events).toContainEqual(expect.objectContaining({ type: "diceRolled", reversed: true }));
  });

  it("Time Warp alone plays again once the turn is over", () => {
    const { state } = roll(activate(solo("timeWarp")).state, 2);
    expect(state.players[state.currentPlayerIndex].id).toBe("hero");
    expect(player(state, "hero").position).toBe(3);
  });

  it("Plasma Cannon blasts the next two traps away and knocks the leading opponent back", () => {
    const start = patch(patch(duel("plasmaCannon"), "hero", { position: 5 }), "rival", { position: 30 });
    const { state } = activate(start);
    expect(state.destroyedTraps).toEqual([12, 20]);
    expect(player(state, "rival").position).toBe(30 - PLASMA_PUSH);
  });

  it("the strongest of them take the long cycle", () => {
    for (const ability of ["cleansingTide", "glacialHowl", "sacredBulwark", "timeWarp", "plasmaCannon"] as const) {
      expect(abilityCycle(ability)).toBe(LONG_ABILITY_CYCLE);
    }
  });
});
