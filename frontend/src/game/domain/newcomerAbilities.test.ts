import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  PLASMA_PUSH,
  TIDE_RANGE,
  TIME_ROUNDS,
  STUDY_DRAWS,
  abilityCycle,
  LONG_ABILITY_CYCLE,
  TIME_WARP_CYCLE,
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

  it("Seraph's Blessing gives one of heaven's blessings, or a card, at random", () => {
    const gifts = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const start = ready(patch(duel("seraphBlessing"), "hero", { hand: [] }));
      const { state, events } = applyCommand(
        start,
        { type: "activateAbility", playerId: "hero" },
        { rollDice: sequenceDice([1]), random: seededRandom(seed) },
      );
      const { blessings, hand } = player(state, "hero");
      if (blessings.length === 1) {
        expect(hand).toHaveLength(0);
        expect(events).toContainEqual(expect.objectContaining({ type: "blessingReceived", playerId: "hero" }));
        return "blessing";
      }
      expect(hand).toHaveLength(1);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardDrawn", playerId: "hero" }));
      return "card";
    });
    expect(new Set(gifts)).toEqual(new Set(["blessing", "card"]));
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

  it("Sacred Bulwark raises the shield and Spectral Armour", () => {
    const { state } = activate(duel("sacredBulwark"));
    expect(player(state, "hero")).toMatchObject({ shielded: true, spectralArmour: ARMOUR_TURNS });
  });

  it(`Time Warp halts an opponent for ${TIME_ROUNDS} rounds`, () => {
    const { state } = activate(duel("timeWarp"), { power: "halt", targetId: "rival" });
    expect(player(state, "rival").skipTurns).toBe(TIME_ROUNDS);
    expect(() => activate(duel("timeWarp"), { power: "halt" })).toThrow();
  });

  it("Time Warp adds up with the turns and rolls already lost", () => {
    const halted = activate(patch(duel("timeWarp"), "rival", { skipTurns: 1 }), { power: "halt", targetId: "rival" });
    expect(player(halted.state, "rival").skipTurns).toBe(1 + TIME_ROUNDS);
    const reversed = activate(patch(duel("timeWarp"), "rival", { reversedRolls: 1 }), {
      power: "reverse",
      targetId: "rival",
    });
    expect(player(reversed.state, "rival").reversedRolls).toBe(1 + TIME_ROUNDS);
  });

  it(`Time Warp only charges again once its ${TIME_ROUNDS} rounds have gone by`, () => {
    let state = activate(duel("timeWarp"), {
      power: "halt",
      targetId: "rival",
    }).state;
    // The rival is halted: the hero plays on alone, without charging.
    for (let turn = 1; turn <= TIME_ROUNDS; turn++) {
      state = roll(state, 1).state;
      expect(player(state, "hero").abilityCharge).toBe(0);
    }
    state = roll(state, 1).state;
    state = send(state, { type: "rollDice", playerId: "rival" }).state;
    expect(player(state, "hero")).toMatchObject({
      abilityCharge: 1,
      chargeHeld: 0,
    });
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

  it("Time Warp can be aimed at an armoured opponent, who turns it away: it's spent for nothing", () => {
    for (const ward of [
      { spectralArmour: 2 },
      { untamed: 2 },
      { divineAegis: 2 },
      { ability: "ocularAwakening", spectralArmour: 2 },
    ] as const) {
      const { state, events } = activate(patch(duel("timeWarp"), "rival", ward), { power: "halt", targetId: "rival" });
      expect(player(state, "rival").skipTurns).toBe(0);
      expect(player(state, "hero")).toMatchObject({
        abilityCharge: 0,
        chargeHeld: 0,
      });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "abilityBlocked",
          playerId: "hero",
          targetId: "rival",
          ability: "timeWarp",
        }),
      );
    }
    const susanoo = activate(
      patch(duel("timeWarp"), "rival", {
        ability: "ocularAwakening",
        spectralArmour: 2,
      }),
      {
        power: "reverse",
        targetId: "rival",
      },
    );
    expect(susanoo.events).toContainEqual(expect.objectContaining({ type: "abilityBlocked", ward: "susanoo" }));
  });

  it("Untamed shakes off reversed time: the rolls walk forward again", () => {
    const start = patch(duel("untamed"), "hero", {
      position: 10,
      reversedRolls: 2,
    });
    const { state } = roll(activate(start).state, 3);
    expect(player(state, "hero")).toMatchObject({
      position: 13,
      reversedRolls: 0,
    });
  });

  it("a charge tile fills the ability even while Time Warp's charge is held, or Untamed lasts", () => {
    const charging: BoardDefinition = {
      size: 30,
      effects: { 4: { kind: "blessing", blessing: "charge" } },
    };
    const game = (ability: AbilityId) =>
      createGame(
        charging,
        [
          { id: "hero", name: "Hero", ability },
          { id: "rival", name: "Rival", ability: "studySession" },
        ],
        { random: seededRandom(7) },
      );
    const warped = roll(activate(game("timeWarp"), { power: "halt", targetId: "rival" }).state, 3).state;
    expect(player(warped, "hero")).toMatchObject({
      position: 4,
      abilityCharge: 1,
    });
    const untamed = roll(activate(game("untamed")).state, 3).state;
    expect(player(untamed, "hero")).toMatchObject({
      position: 4,
      abilityCharge: 1,
    });
  });

  it("under reversed time, Wind Step blows the player back too", () => {
    const start = patch(duel("timeWarp"), "hero", {
      position: 30,
      reversedRolls: 1,
      energy: 5,
      hand: [{ uid: "w", cardId: "windStep" }],
    });
    const { state } = send(start, {
      type: "playCard",
      playerId: "hero",
      cardUid: "w",
    });
    expect(player(state, "hero")).toMatchObject({
      position: 27,
      reversedRolls: 1,
    });
  });

  it("charged again in the same turn (Ascension), the ability can be used again", () => {
    const once = activate(duel("studySession")).state;
    const again = send(ready(once), {
      type: "activateAbility",
      playerId: "hero",
    });
    expect(again.events).toContainEqual(expect.objectContaining({ type: "abilityUsed", playerId: "hero" }));
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

  it("the strongest of them take the long cycle, and Time Warp longer still", () => {
    for (const ability of ["cleansingTide", "untamed", "sacredBulwark", "plasmaCannon"] as const) {
      expect(abilityCycle(ability)).toBe(LONG_ABILITY_CYCLE);
    }
    expect(abilityCycle("timeWarp")).toBe(TIME_WARP_CYCLE);
  });
});
