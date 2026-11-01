import { describe, expect, it } from "vitest";
import { ABILITY_CYCLE, LONG_ABILITY_CYCLE, abilityCycle } from "./charge";
import { DORMANT_FURY_MULTIPLIER, LEVITATION_TURNS, STUDY_DRAWS, TAILWIND_BONUS } from "./basic";
import type { AbilityId } from "./ability";
import { TRAP_AND_CURSE_BOARD } from "../testing/boards";
import {
  activate,
  cards,
  eventsOfType,
  expectRuleError,
  hasEvent,
  newGame,
  play,
  playerOf,
  readyAbility,
  roll,
  turnsAbilityReady,
  withPlayer,
} from "../testing";
import type { GameState, Player } from "../core/state";

const solo = (ability: AbilityId) => newGame(TRAP_AND_CURSE_BOARD, { p1: ability });
const ready = (state: GameState) => readyAbility(state, "p1");
const aria = (state: GameState) => playerOf(state, "p1");

describe("ability charge", () => {
  it("charges over three turns, counting the first, then stays ready until used", () => {
    const { state, readyAt } = turnsAbilityReady(solo("tailwind"), "p1", 6);
    expect(readyAt).toEqual([3]);
    expect(aria(state).abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("recharges from empty once used", () => {
    const used = activate(ready(solo("tailwind")), "p1").state;
    expect(aria(used).abilityCharge).toBe(0);
    expectRuleError(() => activate(used, "p1"), "ABILITY_NOT_READY");
    const twoTurnsLater = roll(roll(used, "p1").state, "p1").state;
    expectRuleError(() => activate(twoTurnsLater, "p1"), "ABILITY_NOT_READY");
    expect(aria(roll(twoTurnsLater, "p1").state).abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("can't be used before it is charged", () => {
    expectRuleError(() => activate(solo("doubleCast"), "p1"), "ABILITY_NOT_READY");
  });

  it("charged again in the same turn (Ascension), can be used again", () => {
    const duel = newGame(TRAP_AND_CURSE_BOARD, { hero: "studySession", rival: "studySession" });
    const once = activate(readyAbility(duel, "hero"), "hero");
    const again = activate(readyAbility(once.state, "hero"), "hero");
    expect(again.events).toContainEqual(expect.objectContaining({ type: "abilityUsed", playerId: "hero" }));
  });
});

describe("Double Cast", () => {
  it("lets two cards be played in the turn it's used", () => {
    const start = withPlayer(ready(solo("doubleCast")), "p1", { hand: cards("arcaneShield", "luckyCharm"), energy: 5 });
    const once = play(start, "p1", "c0").state;
    expectRuleError(() => play(once, "p1", "c1"), "CARD_ALREADY_PLAYED");
    expect(play(activate(once, "p1").state, "p1", "c1").state.cardsPlayedThisTurn).toBe(2);
  });
});

describe("Tailwind", () => {
  it("walks further on the turn it's used", () => {
    const { events, state } = roll(activate(ready(solo("tailwind")), "p1").state, "p1", 3);
    expect(events).toContainEqual(expect.objectContaining({ type: "diceRolled", value: 3 + TAILWIND_BONUS }));
    expect(aria(state).position).toBe(1 + 3 + TAILWIND_BONUS);
  });
});

describe("Dormant Fury", () => {
  const furious = () => activate(ready(solo("dormantFury")), "p1").state;

  it("walks three times the dice, in a flash, on the turn it's used", () => {
    for (const die of [1, 6]) {
      const { events, state } = roll(furious(), "p1", die);
      expect(events).toContainEqual(
        expect.objectContaining({ type: "diceRolled", value: die * DORMANT_FURY_MULTIPLIER, multiplier: 3 }),
      );
      expect(events).toContainEqual(expect.objectContaining({ type: "playerMoved", dash: true }));
      expect(aria(state).position).toBe(1 + die * DORMANT_FURY_MULTIPLIER);
    }
  });

  it("triples card modifiers too, and only that turn", () => {
    const fated = withPlayer(furious(), "p1", { diceBoost: { kind: "fixed", value: 6 } });
    const { state, events } = roll(fated, "p1", 1);
    expect(events).toContainEqual(expect.objectContaining({ type: "diceRolled", value: 18 }));
    const next = roll(state, "p1", 2).events;
    expect(next).toContainEqual(expect.objectContaining({ type: "diceRolled", value: 2 }));
    expect(next).not.toContainEqual(expect.objectContaining({ type: "playerMoved", dash: true }));
  });

  it("takes the long cycle to charge", () => {
    expect(abilityCycle("dormantFury")).toBe(LONG_ABILITY_CYCLE);
  });
});

describe("Study Session", () => {
  it("draws cards right away", () => {
    const { state, events } = activate(withPlayer(ready(solo("studySession")), "p1", { hand: [] }), "p1");
    expect(eventsOfType(events, "cardDrawn")).toHaveLength(2);
    expect(aria(state).hand).toHaveLength(2);
  });

  it(`draws ${STUDY_DRAWS} cards with opponents at the table too`, () => {
    const duel = newGame(TRAP_AND_CURSE_BOARD, { hero: "studySession", rival: "studySession" });
    const { state } = activate(readyAbility(withPlayer(duel, "hero", { hand: [] }), "hero"), "hero");
    expect(playerOf(state, "hero").hand).toHaveLength(STUDY_DRAWS);
  });
});

describe("Levitation", () => {
  const floating = (patch: Partial<Player> = {}) =>
    activate(withPlayer(ready(solo("levitation")), "p1", { position: 10, energy: 3, ...patch }), "p1").state;

  it("charges over the long cycle and floats for two turns", () => {
    expect(abilityCycle("levitation")).toBe(LONG_ABILITY_CYCLE);
    expect(aria(floating()).levitating).toBe(LEVITATION_TURNS);
  });

  it("floats over traps without being thrown back or cursed", () => {
    const { state, events } = roll(floating(), "p1", 2);
    expect(aria(state)).toMatchObject({ position: 12, energy: 3 });
    expect(events).toContainEqual({ type: "levitatedOver", playerId: "p1", tile: 12 });
    expect(hasEvent(events, "trapTriggered", "trapCursed")).toBe(false);
  });

  it("floats over curses too, and keeps an Arcane Shield untouched", () => {
    const { state } = roll(floating({ shielded: true, hand: cards("windStep") }), "p1", 10);
    expect(aria(state)).toMatchObject({ position: 20, shielded: true, hand: cards("windStep") });
  });

  it("floats over a hidden trap without springing or revealing it", () => {
    const { state, events } = roll({ ...floating(), hiddenTraps: [11] }, "p1", 1);
    expect(aria(state).position).toBe(11);
    expect(state.hiddenTraps).toEqual([11]);
    expect(hasEvent(events, "hiddenTrapSprung", "levitatedOver")).toBe(false);
  });

  it("lands after its second turn", () => {
    const first = roll(floating(), "p1", 1).state;
    expect(aria(first).levitating).toBe(1);
    const second = roll(first, "p1", 1).state;
    expect(aria(second).levitating).toBe(0);
    expect(aria(roll(withPlayer(second, "p1", { position: 11 }), "p1", 1).state).position).toBe(8);
  });
});
