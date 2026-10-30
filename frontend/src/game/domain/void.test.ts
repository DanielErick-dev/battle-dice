import { describe, expect, it } from "vitest";
import {
  ABILITY_CYCLE,
  abilityCycle,
  FLAME_TURNS,
  VOID_CAPACITY,
  VOID_DOUBLE_ENERGY,
  VOID_IDLE_ROUNDS,
} from "./abilities";
import { getTile } from "./board";
import { HIDDEN_TRAP_PUSH } from "./hiddenTraps";
import {
  TRAP_AND_CURSE_BOARD,
  activate,
  cards,
  expectRuleError,
  hasEvent,
  newGame,
  onTurnOf,
  playerOf,
  readyAbility,
  roll,
  send,
  turnsAbilityReady,
  withPlayer,
  withTileEffect,
} from "./testing";
import type { GameState, Player, VoidItem } from "./types";

const duel = () =>
  withTileEffect(newGame(TRAP_AND_CURSE_BOARD, { zarek: "theVoid", rival: null }), 25, { kind: "skipTurn" });
const zarek = (state: GameState) => playerOf(state, "zarek");
const answer = (state: GameState, use: boolean) => send(state, { type: "answerWard", playerId: "zarek", use });
const place = (state: GameState, index: number, tile: number, doubled = false) =>
  send(state, { type: "placeVoid", playerId: "zarek", index, tile, doubled });
/** Charged, one step before the trap at 12 (back to 8, draining). */
const onTheWay = (patch: Partial<Player> = {}) =>
  withPlayer(readyAbility(duel(), "zarek"), "zarek", { position: 11, energy: 3, ...patch });
const holding = (items: VoidItem[], patch: Partial<Player> = {}) =>
  withPlayer(duel(), "zarek", { voidHold: items, energy: 5, ...patch });
/** The rival's turn, standing on `from`, rolling `die`. */
const rivalRolls = (state: GameState, from: number, die: number) =>
  roll(onTurnOf(withPlayer(state, "rival", { position: from }), "rival"), "rival", die);

describe("Zarek's Void", () => {
  it(`charges in ${ABILITY_CYCLE} turns, counting the first`, () => {
    const { readyAt } = turnsAbilityReady(newGame(TRAP_AND_CURSE_BOARD, { zarek: "theVoid" }), "zarek", 8);
    expect(readyAt).toEqual([ABILITY_CYCLE]);
    expect(abilityCycle("theVoid")).toBe(ABILITY_CYCLE);
  });

  it("can't be used from the button until it has been idle a while: it answers the board", () => {
    expectRuleError(() => activate(onTheWay(), "zarek"), "ABILITY_REACTIVE");
  });

  it("asks before a trap strikes, and holds the turn until answered", () => {
    const { state, events } = roll(onTheWay(), "zarek", 1);
    expect(events).toContainEqual({ type: "wardOffered", playerId: "zarek", tile: 12, threat: "trap" });
    expect(state.pendingWard).toMatchObject({ playerId: "zarek", tile: 12, endsTurn: true });
    expectRuleError(() => roll(state, "zarek", 1), "WARD_PENDING");
  });

  describe("swallowing", () => {
    it("takes the trap into the Void, curse and all, and leaves the tile harmless for good", () => {
      const { state, events } = answer(roll(onTheWay(), "zarek", 1).state, true);
      const item = { kind: "trap", back: 4, curse: "drain" };
      expect(events).toContainEqual({ type: "voidSwallowed", playerId: "zarek", tile: 12, item, hidden: false });
      expect(zarek(state)).toMatchObject({ position: 12, energy: 3, abilityCharge: 0, voidHold: [item] });
      expect(state.destroyedTraps).toEqual([12]);
      const again = rivalRolls(state, 11, 1);
      expect(playerOf(again.state, "rival").position).toBe(12);
      expect(hasEvent(again.events, "trapTriggered")).toBe(false);
    });

    it("takes a curse and a lost turn too", () => {
      const cursed = answer(roll(onTheWay({ position: 19 }), "zarek", 1).state, true).state;
      expect(zarek(cursed).voidHold).toEqual([{ kind: "curse", curse: "discard" }]);
      const { state, events } = roll(onTheWay({ position: 24 }), "zarek", 1);
      expect(events).toContainEqual({ type: "wardOffered", playerId: "zarek", tile: 25, threat: "skipTurn" });
      const swallowed = answer(state, true).state;
      expect(zarek(swallowed)).toMatchObject({ skipTurns: 0, voidHold: [{ kind: "skipTurn" }] });
      expect(playerOf(rivalRolls(swallowed, 24, 1).state, "rival").skipTurns).toBe(0);
    });

    it("takes a hidden trap off the board", () => {
      const zoned = newGame(
        { size: 40, effects: {}, trapZones: [{ from: 10, to: 13, traps: 1 }] },
        { zarek: "theVoid" },
      );
      const trap = zoned.hiddenTraps[0];
      const before = withPlayer(readyAbility(zoned, "zarek"), "zarek", { position: trap - 1 });
      const { state } = answer(roll(before, "zarek", 1).state, true);
      expect(state.hiddenTraps).toEqual([]);
      expect(zarek(state).voidHold).toEqual([{ kind: "trap", back: HIDDEN_TRAP_PUSH }]);
    });

    it("declined, lets the harm strike and stays charged", () => {
      const { state } = answer(roll(onTheWay(), "zarek", 1).state, false);
      expect(zarek(state)).toMatchObject({ position: 8, energy: 1, abilityCharge: ABILITY_CYCLE, voidHold: [] });
      const skipped = answer(roll(onTheWay({ position: 24 }), "zarek", 1).state, false).state;
      expect(zarek(skipped).skipTurns).toBe(1);
    });

    it("isn't offered when not ready or when the Void is full: the harm just strikes", () => {
      const full = Array.from({ length: VOID_CAPACITY }, () => ({ kind: "skipTurn" }) as const);
      for (const patch of [{ abilityCharge: 0 }, { voidHold: full }]) {
        const { state, events } = roll(onTheWay(patch), "zarek", 1);
        expect(hasEvent(events, "wardOffered")).toBe(false);
        expect(zarek(state).position).toBe(8);
      }
    });

    it("is offered over the Arcane Shield, which is kept when used", () => {
      const { state } = roll(onTheWay({ shielded: true, hand: cards("windStep") }), "zarek", 1);
      expect(zarek(answer(state, true).state)).toMatchObject({ position: 12, shielded: true });
    });
  });

  describe("fed by traps", () => {
    it("each trap anyone falls into charges the Void", () => {
      const { state, events } = rivalRolls(duel(), 11, 1);
      expect(events).toContainEqual({ type: "voidFed", playerId: "zarek", charge: 1 });
      // Plus the charge of his own turn starting.
      expect(zarek(state).abilityCharge).toBe(zarek(duel()).abilityCharge + 2);
    });

    it("his own swallowing doesn't", () => {
      const { events } = answer(roll(onTheWay(), "zarek", 1).state, true);
      expect(hasEvent(events, "voidFed")).toBe(false);
    });
  });

  describe("rifts", () => {
    const rifted = (doubled = false) => place(holding([{ kind: "trap", back: 4 }]), 0, 30, doubled);

    it("a harm opens a new tile in the path right after the one picked", () => {
      const { state, events } = rifted();
      const rift = state.board.tiles.length;
      expect(events).toContainEqual({ type: "riftOpened", playerId: "zarek", rift: getTile(state.board, rift) });
      expect(getTile(state.board, 30).next).toBe(rift);
      expect(getTile(state.board, rift)).toMatchObject({ role: "rift", next: 31, previous: 30 });
      expect(getTile(state.board, 31).previous).toBe(rift);
      expect(zarek(state).voidHold).toEqual([]);
      // Two steps from 29 now end on the rift, which throws back 4 along the new path.
      expect(playerOf(rivalRolls(state, 29, 2).state, "rival").position).toBe(27);
      expect(playerOf(rivalRolls(state, 29, 3).state, "rival").position).toBe(31);
    });

    it("never harms Zarek himself", () => {
      const { state } = rifted();
      const { state: after, events } = roll(withPlayer(state, "zarek", { position: 29 }), "zarek", 2);
      expect(zarek(after).position).toBe(state.board.tiles.length);
      expect(hasEvent(events, "trapTriggered", "wardOffered")).toBe(false);
    });

    it(`doubled for ${VOID_DOUBLE_ENERGY} energy: twice the setback`, () => {
      const { state } = rifted(true);
      expect(zarek(state).energy).toBe(5 - VOID_DOUBLE_ENERGY);
      expect(playerOf(rivalRolls(state, 29, 2).state, "rival").position).toBe(23);
      expectRuleError(
        () => place(holding([{ kind: "trap", back: 4 }], { energy: 1 }), 0, 30, true),
        "NOT_ENOUGH_ENERGY",
      );
    });

    it("doubled, a lost turn costs two and a curse strikes twice", () => {
      const skip = place(holding([{ kind: "skipTurn" }]), 0, 30, true).state;
      expect(playerOf(rivalRolls(skip, 29, 2).state, "rival").skipTurns).toBe(2);
      const curse = place(holding([{ kind: "curse", curse: "drain" }]), 0, 30, true).state;
      const drained = rivalRolls(withPlayer(curse, "rival", { energy: 6 }), 29, 2).state;
      expect(playerOf(drained, "rival").energy).toBe(2);
    });

    it("can't open after the finish or inside a realm, nor set down what isn't held", () => {
      expectRuleError(() => place(holding([{ kind: "skipTurn" }]), 0, 40), "INVALID_VOID");
      expectRuleError(() => place(holding([]), 0, 30), "INVALID_VOID");
    });

    it("close again for a new match", () => {
      const { state } = rifted();
      const restarted = send(state, { type: "restart" }).state;
      expect(restarted.board.tiles).toHaveLength(duel().board.tiles.length);
      expect(getTile(restarted.board, 30).next).toBe(31);
      expect(getTile(restarted.board, 31).previous).toBe(30);
    });
  });

  describe(`idle for ${VOID_IDLE_ROUNDS} turns`, () => {
    const burning = () => ({
      ...readyAbility(holding([], { voidIdle: VOID_IDLE_ROUNDS }), "zarek"),
      blackFlames: [{ tile: 20, owner: "rival", turnsLeft: 3, hits: 1 }],
    });

    it("counts his turns since the Void last acted", () => {
      const once = roll(duel(), "zarek", 1).state;
      expect(zarek(once).voidIdle).toBe(1);
    });

    it("takes over another's spell, then sets it down as his own", () => {
      const { state, events } = activate(burning(), "zarek", { seizeTile: 20 });
      expect(events).toContainEqual({ type: "voidSeized", playerId: "zarek", tile: 20, item: { kind: "flame" } });
      expect(state.blackFlames).toEqual([]);
      expect(zarek(state)).toMatchObject({ voidIdle: 0, abilityCharge: 0, voidHold: [{ kind: "flame" }] });
      const cast = place(state, 0, 33).state;
      expect(cast.blackFlames).toEqual([{ tile: 33, owner: "zarek", turnsLeft: FLAME_TURNS, hits: 0 }]);
    });

    it("needs the idle turns, and a tile with a spell on it", () => {
      expectRuleError(
        () => activate(withPlayer(burning(), "zarek", { voidIdle: 1 }), "zarek", { seizeTile: 20 }),
        "ABILITY_REACTIVE",
      );
      expectRuleError(() => activate(burning(), "zarek", { seizeTile: 21 }), "INVALID_VOID");
    });
  });
});
