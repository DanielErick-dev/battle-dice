import { describe, expect, it } from "vitest";
import { PLASMA_PUSH } from "./alva/plasmaCannon";
import { TIDE_RANGE } from "./auric/cleansingTide";
import { TIME_ROUNDS } from "./cronos/timeWarp";
import { abilityCycle, LONG_ABILITY_CYCLE, TIME_WARP_CYCLE } from "../abilities/charge";
import type { AbilityId } from "../abilities/ability";
import type { BoardDefinition } from "../board/board";
import { DIVINE_CARDS } from "../cards/catalog";
import {
  activate as activateFor,
  card,
  newGame,
  play,
  playerOf,
  readyAbility,
  roll,
  send,
  withPlayer,
  withPlayers,
  type ActivateOptions,
} from "../testing";
import type { GameState } from "../core/state";

/** Traps at 12 and 20, a curse at 15; everything else plain. */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    12: { kind: "trap", to: 8 },
    15: { kind: "curse", curse: "drain" },
    20: { kind: "trap", to: 16 },
  },
};

const duel = (ability: AbilityId) => newGame(BOARD, { hero: ability, rival: "studySession" });
const solo = (ability: AbilityId) => newGame(BOARD, { hero: ability });
const ready = (state: GameState) => readyAbility(state, "hero");
/** Charges the hero's ability and uses it at once. */
const activate = (state: GameState, options: ActivateOptions = {}) => activateFor(ready(state), "hero", options);

describe("the newcomers' abilities", () => {
  it("Seraph's Blessing gives one of heaven's blessings, or a heaven card, at random", () => {
    const gifts = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const start = ready(withPlayer(duel("seraphBlessing"), "hero", { hand: [] }));
      const { state, events } = send(start, { type: "activateAbility", playerId: "hero" }, [1], seed);
      const { blessings, hand } = playerOf(state, "hero");
      if (blessings.length === 1) {
        expect(hand).toHaveLength(0);
        expect(events).toContainEqual(expect.objectContaining({ type: "blessingReceived", playerId: "hero" }));
        return "blessing";
      }
      expect(hand).toHaveLength(1);
      expect(DIVINE_CARDS).toContain(hand[0].cardId);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardDrawn", playerId: "hero" }));
      return "card";
    });
    expect(new Set(gifts)).toEqual(new Set(["blessing", "card"]));
  });

  it(`Cleansing Tide washes every spell off the ${TIDE_RANGE} tiles ahead, and only those`, () => {
    const spelled: GameState = {
      ...withPlayer(duel("cleansingTide"), "hero", { position: 10 }),
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

  it(`Time Warp halts an opponent for ${TIME_ROUNDS} rounds`, () => {
    const { state } = activate(duel("timeWarp"), { power: "halt", targetId: "rival" });
    expect(playerOf(state, "rival").skipTurns).toBe(TIME_ROUNDS);
    expect(() => activate(duel("timeWarp"), { power: "halt" })).toThrow();
  });

  it("Time Warp adds up with the turns and rolls already lost", () => {
    const halted = activate(withPlayer(duel("timeWarp"), "rival", { skipTurns: 1 }), {
      power: "halt",
      targetId: "rival",
    });
    expect(playerOf(halted.state, "rival").skipTurns).toBe(1 + TIME_ROUNDS);
    const reversed = activate(withPlayer(duel("timeWarp"), "rival", { reversedRolls: 1 }), {
      power: "reverse",
      targetId: "rival",
    });
    expect(playerOf(reversed.state, "rival").reversedRolls).toBe(1 + TIME_ROUNDS);
  });

  it(`Time Warp only charges again once its ${TIME_ROUNDS} rounds have gone by`, () => {
    let state = activate(duel("timeWarp"), {
      power: "halt",
      targetId: "rival",
    }).state;
    // The rival is halted: the hero plays on alone, without charging.
    for (let turn = 1; turn <= TIME_ROUNDS; turn++) {
      state = roll(state, "hero", 1).state;
      expect(playerOf(state, "hero").abilityCharge).toBe(0);
    }
    state = roll(state, "hero", 1).state;
    state = roll(state, "rival").state;
    expect(playerOf(state, "hero")).toMatchObject({
      abilityCharge: 1,
      chargeHeld: 0,
    });
  });

  it(`Time Warp reverses an opponent's next ${TIME_ROUNDS} rolls`, () => {
    let state = activate(withPlayer(duel("timeWarp"), "rival", { position: 30 }), {
      power: "reverse",
      targetId: "rival",
    }).state;
    state = roll(state, "hero", 1).state;
    const back = roll(state, "rival", 4);
    expect(playerOf(back.state, "rival")).toMatchObject({ position: 26, reversedRolls: TIME_ROUNDS - 1 });
    expect(back.events).toContainEqual(expect.objectContaining({ type: "diceRolled", reversed: true }));
  });

  it("Time Warp can be aimed at an armoured opponent, who turns it away: it's spent for nothing", () => {
    for (const ward of [
      { spectralArmour: 2 },
      { untamed: 2 },
      { divineAegis: 2 },
      { ability: "ocularAwakening", spectralArmour: 2 },
    ] as const) {
      const { state, events } = activate(withPlayer(duel("timeWarp"), "rival", ward), {
        power: "halt",
        targetId: "rival",
      });
      expect(playerOf(state, "rival").skipTurns).toBe(0);
      expect(playerOf(state, "hero")).toMatchObject({
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
      withPlayer(duel("timeWarp"), "rival", {
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
    const start = withPlayer(duel("untamed"), "hero", {
      position: 10,
      reversedRolls: 2,
    });
    const { state } = roll(activate(start).state, "hero", 3);
    expect(playerOf(state, "hero")).toMatchObject({
      position: 13,
      reversedRolls: 0,
    });
  });

  it("a charge tile fills the ability even while Time Warp's charge is held, or Untamed lasts", () => {
    const charging: BoardDefinition = {
      size: 30,
      effects: { 4: { kind: "blessing", blessing: "charge" } },
    };
    const game = (ability: AbilityId) => newGame(charging, { hero: ability, rival: "studySession" });
    const warped = roll(activate(game("timeWarp"), { power: "halt", targetId: "rival" }).state, "hero", 3).state;
    expect(playerOf(warped, "hero")).toMatchObject({
      position: 4,
      abilityCharge: 1,
    });
    const untamed = roll(activate(game("untamed")).state, "hero", 3).state;
    expect(playerOf(untamed, "hero")).toMatchObject({
      position: 4,
      abilityCharge: 1,
    });
  });

  it("under reversed time, Wind Step blows the player back too", () => {
    const start = withPlayer(duel("timeWarp"), "hero", {
      position: 30,
      reversedRolls: 1,
      energy: 5,
      hand: [card("windStep", "w")],
    });
    const { state } = play(start, "hero", "w");
    expect(playerOf(state, "hero")).toMatchObject({
      position: 27,
      reversedRolls: 1,
    });
  });

  it("Time Warp alone plays again once the turn is over", () => {
    const { state } = roll(activate(solo("timeWarp")).state, "hero", 2);
    expect(state.players[state.currentPlayerIndex].id).toBe("hero");
    expect(playerOf(state, "hero").position).toBe(3);
  });

  it("Plasma Cannon blasts the next two traps away and knocks the leading opponent back", () => {
    const start = withPlayers(duel("plasmaCannon"), { hero: { position: 5 }, rival: { position: 30 } });
    const { state } = activate(start);
    expect(state.destroyedTraps).toEqual([12, 20]);
    expect(playerOf(state, "rival").position).toBe(30 - PLASMA_PUSH);
  });

  it("the strongest of them take the long cycle, and Time Warp longer still", () => {
    for (const ability of ["cleansingTide", "untamed", "plasmaCannon"] as const) {
      expect(abilityCycle(ability)).toBe(LONG_ABILITY_CYCLE);
    }
    expect(abilityCycle("timeWarp")).toBe(TIME_WARP_CYCLE);
  });
});
