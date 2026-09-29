import { describe, expect, it } from "vitest";
import {
  ABILITY_CYCLE,
  CELESTIAL_GRACE_ENERGY,
  CRIMSON_MARCH_BONUS,
  LEVITATION_TURNS,
  LONG_ABILITY_CYCLE,
  abilityCycle,
  type AbilityId,
} from "./abilities";
import type { BoardDefinition } from "./board";
import { GameRuleError, type GameCommand, type GameErrorCode } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { CardInstance, GameState, Player } from "./types";

const BOARD: BoardDefinition = {
  size: 40,
  effects: {
    12: { kind: "trap", to: 8, curse: "drain" },
    20: { kind: "curse", curse: "discard" },
  },
};

const game = (ability: AbilityId) =>
  createGame(BOARD, [{ id: "p1", name: "Aria", ability }], {
    random: seededRandom(7),
  });

function withPlayer(state: GameState, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, ...patch })),
  };
}

const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, {
    rollDice: sequenceDice(dice),
    random: seededRandom(3),
  });
const roll = (state: GameState, ...dice: number[]) => send(state, { type: "rollDice", playerId: "p1" }, dice);
const play = (state: GameState, cardUid: string) => send(state, { type: "playCard", playerId: "p1", cardUid });
const activate = (state: GameState) => send(state, { type: "activateAbility", playerId: "p1" });
const answer = (state: GameState, use: boolean) => send(state, { type: "answerWard", playerId: "p1", use });

const ready = (state: GameState) => withPlayer(state, { abilityCharge: abilityCycle(state.players[0].ability) });
const cards = (...ids: CardInstance["cardId"][]): CardInstance[] => ids.map((cardId, i) => ({ uid: `c${i}`, cardId }));

function expectRuleError(action: () => unknown, code: GameErrorCode) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(GameRuleError);
    expect((error as GameRuleError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

describe("character abilities", () => {
  it("charge over three turns, counting the first, then stay ready until used", () => {
    let state = game("crimsonMarch");
    const readyAt: number[] = [];
    for (let turn = 1; turn <= 6; turn++) {
      const { state: next, events } = roll(state, 1);
      if (events.some((event) => event.type === "abilityReady")) readyAt.push(turn + 1);
      state = next;
    }
    expect(readyAt).toEqual([3]);
    expect(state.players[0].abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("recharge from empty once used", () => {
    const used = activate(ready(game("crimsonMarch"))).state;
    expect(used.players[0].abilityCharge).toBe(0);
    expectRuleError(() => activate(used), "ABILITY_NOT_READY");
    expectRuleError(() => activate(roll(roll(used, 1).state, 1).state), "ABILITY_NOT_READY");
    const recharged = roll(roll(roll(used, 1).state, 1).state, 1).state;
    expect(recharged.players[0].abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("can't be used before they are charged", () => {
    expectRuleError(() => activate(game("doubleCast")), "ABILITY_NOT_READY");
  });

  it("Double Cast lets two cards be played in the turn it's used", () => {
    const hand = cards("arcaneShield", "luckyCharm");
    const once = play(withPlayer(ready(game("doubleCast")), { hand, energy: 5 }), "c0").state;
    expectRuleError(() => play(once, "c1"), "CARD_ALREADY_PLAYED");
    expect(play(activate(once).state, "c1").state.cardsPlayedThisTurn).toBe(2);
  });

  it("Crimson March walks further on the turn it's used", () => {
    const { events, state } = roll(activate(ready(game("crimsonMarch"))).state, 3);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "diceRolled",
        value: 3 + CRIMSON_MARCH_BONUS,
      }),
    );
    expect(state.players[0].position).toBe(1 + 3 + CRIMSON_MARCH_BONUS);
  });

  it("Celestial Grace gives energy right away, and waits while energy is full", () => {
    const { state, events } = activate(withPlayer(ready(game("celestialGrace")), { energy: 1 }));
    expect(events).toContainEqual({
      type: "abilityUsed",
      playerId: "p1",
      ability: "celestialGrace",
      energyGained: CELESTIAL_GRACE_ENERGY,
    });
    expect(state.players[0].energy).toBe(1 + CELESTIAL_GRACE_ENERGY);
    expectRuleError(() => activate(withPlayer(ready(game("celestialGrace")), { energy: 5 })), "ENERGY_FULL");
  });

  it("Dragon Hoard draws cards right away", () => {
    const before = withPlayer(ready(game("dragonHoard")), { hand: [] });
    const { state, events } = activate(before);
    expect(events.filter((event) => event.type === "cardDrawn")).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(2);
  });

  describe("Levitation", () => {
    const floating = (patch: Partial<Player> = {}) =>
      activate(withPlayer(ready(game("levitation")), { position: 10, energy: 3, ...patch })).state;

    it("charges over the long cycle and floats for two turns", () => {
      expect(abilityCycle("levitation")).toBe(LONG_ABILITY_CYCLE);
      expect(floating().players[0].levitating).toBe(LEVITATION_TURNS);
    });

    it("floats over traps without being thrown back or cursed", () => {
      const { state, events } = roll(floating(), 2);
      expect(state.players[0]).toMatchObject({ position: 12, energy: 3 });
      expect(events).toContainEqual({ type: "levitatedOver", playerId: "p1", tile: 12 });
      expect(events.some((event) => event.type === "trapTriggered" || event.type === "trapCursed")).toBe(false);
    });

    it("floats over curses too, and keeps an Arcane Shield untouched", () => {
      const { state } = roll(floating({ shielded: true, hand: cards("windStep") }), 10);
      expect(state.players[0]).toMatchObject({ position: 20, shielded: true, hand: cards("windStep") });
    });

    it("floats over a hidden trap without springing or revealing it", () => {
      const start = { ...floating(), hiddenTraps: [11] };
      const { state, events } = roll(start, 1);
      expect(state.players[0].position).toBe(11);
      expect(state.hiddenTraps).toEqual([11]);
      expect(events.some((event) => event.type === "hiddenTrapSprung" || event.type === "levitatedOver")).toBe(false);
    });

    it("lands after its second turn", () => {
      const first = roll(floating(), 1).state;
      expect(first.players[0].levitating).toBe(1);
      const second = roll(first, 1).state;
      expect(second.players[0].levitating).toBe(0);
      expect(roll(withPlayer(second, { position: 11 }), 1).state.players[0].position).toBe(8);
    });
  });

  describe("Trap Ward", () => {
    const onTheWay = (patch: Partial<Player> = {}) =>
      withPlayer(ready(game("trapWard")), {
        position: 11,
        energy: 3,
        ...patch,
      });

    it("can't be used on its own: it answers traps", () => {
      expectRuleError(() => activate(onTheWay()), "ABILITY_REACTIVE");
    });

    it("asks before a trap strikes, and holds the turn until answered", () => {
      const { state, events } = roll(onTheWay(), 1);
      expect(events).toContainEqual({
        type: "wardOffered",
        playerId: "p1",
        tile: 12,
        threat: "trap",
      });
      expect(state.pendingWard).toMatchObject({
        playerId: "p1",
        tile: 12,
        endsTurn: true,
      });
      expect(state.players[0].position).toBe(12);
      expectRuleError(() => roll(state, 1), "WARD_PENDING");
    });

    it("used, keeps the trap off and empties the charge", () => {
      const { state, events } = answer(roll(onTheWay(), 1).state, true);
      expect(events).toContainEqual({
        type: "trapBlocked",
        playerId: "p1",
        tile: 12,
        ward: "ability",
        hidden: false,
      });
      expect(state.players[0]).toMatchObject({
        position: 12,
        energy: 3,
        abilityCharge: 1,
      });
      expect(state.pendingWard).toBeNull();
    });

    it("used, smashes the trap for good: the tile never strikes again", () => {
      const { state: smashed, events } = answer(roll(onTheWay(), 1).state, true);
      expect(events).toContainEqual({ type: "trapDestroyed", playerId: "p1", tile: 12, hidden: false });
      expect(smashed.destroyedTraps).toEqual([12]);

      let state = smashed;
      for (let turn = 0; turn < 4; turn++) {
        const next = roll(withPlayer(state, { position: 11, abilityCharge: 0 }), 1);
        expect(next.state.players[0].position).toBe(12);
        expect(next.events.some((event) => event.type === "wardOffered" || event.type === "trapTriggered")).toBe(false);
        state = next.state;
      }
    });

    it("used on a hidden trap, takes it off the board for good", () => {
      const zoned = createGame(
        { size: 40, effects: {}, trapZones: [{ from: 10, to: 13, traps: 1 }] },
        [{ id: "p1", name: "Aria", ability: "trapWard" }],
        { random: seededRandom(7) },
      );
      const trap = zoned.hiddenTraps[0];
      const smashed = answer(roll(withPlayer(ready(zoned), { position: trap - 1 }), 1).state, true).state;
      expect(smashed.hiddenTraps).toEqual([]);
      expect(smashed.destroyedTraps).toEqual([trap]);
    });

    it("used on a curse, wards it off but leaves it in place", () => {
      const { state } = roll(onTheWay({ position: 19 }), 1);
      expect(answer(state, true).state.destroyedTraps).toEqual([]);
    });

    it("declined, lets the trap strike and stays charged", () => {
      const { state } = answer(roll(onTheWay(), 1).state, false);
      expect(state.players[0]).toMatchObject({ position: 8, energy: 1, abilityCharge: LONG_ABILITY_CYCLE });
    });

    it("takes five turns to charge, counting the first", () => {
      let state = game("trapWard");
      const readyAt: number[] = [];
      for (let turn = 1; turn <= 8; turn++) {
        const { state: next, events } = roll(state, 1);
        if (events.some((event) => event.type === "abilityReady")) readyAt.push(turn + 1);
        state = next;
      }
      expect(readyAt).toEqual([LONG_ABILITY_CYCLE]);
      expect(abilityCycle("trapWard")).toBe(5);
    });

    it("is offered even behind the Arcane Shield, which it then keeps", () => {
      const { state, events } = roll(onTheWay({ shielded: true }), 1);
      expect(events).toContainEqual({ type: "wardOffered", playerId: "p1", tile: 12, threat: "trap" });
      expect(answer(state, true).state.players[0]).toMatchObject({ position: 12, shielded: true, abilityCharge: 1 });
    });

    it("declined behind the Arcane Shield, lets the shield take the trap and stays charged", () => {
      const { state } = answer(roll(onTheWay({ shielded: true }), 1).state, false);
      expect(state.players[0]).toMatchObject({ position: 12, shielded: false, abilityCharge: LONG_ABILITY_CYCLE });
      expect(state.destroyedTraps).toEqual([]);
    });

    it("is offered for curses too, which the shield doesn't stop", () => {
      const { state } = roll(onTheWay({ position: 19, shielded: true, hand: cards("windStep") }), 1);
      expect(state.pendingWard?.threat).toBe("curse");
      expect(answer(state, true).state.players[0].hand).toHaveLength(1);
    });
  });
});
