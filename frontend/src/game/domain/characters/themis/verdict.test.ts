import { describe, expect, it } from "vitest";
import { abilityCycle, VERDICT_CYCLE } from "../../abilities/charge";
import { CARD_GAMBLE_STOLEN } from "../jester/cardGamble";
import { TIME_ROUNDS } from "../cronos/timeWarp";
import type { BoardDefinition } from "../../board/board";
import { ARCANE_BLAST_PUSH } from "../../cards/play";
import {
  activate,
  card,
  cards,
  eventsOfType,
  expectRuleError,
  newGame,
  play,
  playerOf,
  readyAbility,
  withPlayer,
  withPlayers,
} from "../../testing";
import type { GameState } from "../../core/state";
import { MARKS_TO_JUDGE, VERDICT_CHARGE, VERDICT_ENERGY, VERDICT_MULTIPLIER } from "./verdict";

/** Hell through the portal on 50 (out at 55); hell's first tile is 61. */
const BOARD: BoardDefinition = { size: 60, effects: { 50: { kind: "portal", to: 55, realm: "infernal" } } };
const HELL = 61;

/** The hero aims at Themis ("judge"), a few tiles ahead of them. */
const duel = (heroAbility: Parameters<typeof abilityCycle>[0] = "studySession") =>
  withPlayers(newGame(BOARD, { hero: heroAbility, judge: "silentVerdict" }), {
    hero: { position: 30, energy: 10 },
    judge: { position: 35 },
  });
/** Armed, against a hero who already carries a Mark of Justice. */
const armed = (state: GameState) => readyAbility(withPlayer(state, "hero", { justiceMarks: MARKS_TO_JUDGE }), "judge");
const holding = (state: GameState, ...ids: Parameters<typeof card>[0][]) =>
  withPlayer(state, "hero", { hand: ids.map((id) => card(id, id)) });

describe("Silent Verdict", () => {
  it("charges in its own cycle and can't be used by hand", () => {
    expect(abilityCycle("silentVerdict")).toBe(VERDICT_CYCLE);
    const start = { ...armed(duel()), currentPlayerIndex: 1 };
    expectRuleError(() => activate(start, "judge"), "ABILITY_REACTIVE");
  });

  it("armed, turns a marked attacker's Arcane Blast on them twice as hard, spent along with the marks", () => {
    const { state, events } = play(holding(armed(duel()), "arcaneBlast"), "hero", "arcaneBlast", {
      targetId: "judge",
    });
    expect(playerOf(state, "judge")).toMatchObject({ position: 35, abilityCharge: VERDICT_CHARGE });
    expect(playerOf(state, "hero")).toMatchObject({
      position: 30 - ARCANE_BLAST_PUSH * VERDICT_MULTIPLIER,
      justiceMarks: 0,
    });
    expect(events).toContainEqual({
      type: "verdictPassed",
      playerId: "judge",
      attackerId: "hero",
      energyGained: VERDICT_ENERGY,
      cardId: "arcaneBlast",
    });
  });

  it("armed, turns even an unmarked attacker's blast aimed at her", () => {
    const start = readyAbility(duel(), "judge");
    const { state, events } = play(holding(start, "arcaneBlast"), "hero", "arcaneBlast", { targetId: "judge" });
    expect(playerOf(state, "judge")).toMatchObject({ position: 35, abilityCharge: VERDICT_CHARGE });
    expect(playerOf(state, "hero").position).toBe(30 - ARCANE_BLAST_PUSH * VERDICT_MULTIPLIER);
    expect(eventsOfType(events, "justiceMarked")).toEqual([]);
  });

  it("armed, lets an unmarked attacker's first blast at someone else through, and marks them", () => {
    const start = withPlayers(
      readyAbility(newGame(BOARD, { hero: null, judge: "silentVerdict", victim: null }), "judge"),
      {
        hero: { position: 30, energy: 10, hand: cards("arcaneBlast") },
        judge: { position: 35 },
        victim: { position: 40 },
      },
    );
    const { state, events } = play(start, "hero", "c0", { targetId: "victim" });
    expect(playerOf(state, "victim").position).toBe(40 - ARCANE_BLAST_PUSH);
    expect(playerOf(state, "judge").abilityCharge).toBe(VERDICT_CYCLE);
    expect(eventsOfType(events, "justiceMarked")).toEqual([
      { type: "justiceMarked", playerId: "hero", by: "judge", marks: 1 },
    ]);
  });

  it("unarmed, lets a once-marked attacker's blast through and marks them again", () => {
    const start = withPlayer(duel(), "hero", { justiceMarks: 1 });
    const { state, events } = play(holding(start, "arcaneBlast"), "hero", "arcaneBlast", { targetId: "judge" });
    expect(playerOf(state, "judge").position).toBe(35 - ARCANE_BLAST_PUSH);
    expect(playerOf(state, "hero").justiceMarks).toBe(2);
    expect(eventsOfType(events, "verdictPassed")).toEqual([]);
  });

  it("unarmed, lets a fully marked attacker get away with it, and their marks start over", () => {
    const start = withPlayer(duel(), "hero", { justiceMarks: MARKS_TO_JUDGE });
    const { state } = play(holding(start, "arcaneBlast"), "hero", "arcaneBlast", { targetId: "judge" });
    expect(playerOf(state, "judge").position).toBe(35 - ARCANE_BLAST_PUSH);
    expect(playerOf(state, "hero").justiceMarks).toBe(0);
  });

  it("armed, still lets a once-marked attacker's blast at someone else through", () => {
    const start = withPlayers(
      readyAbility(newGame(BOARD, { hero: null, judge: "silentVerdict", victim: null }), "judge"),
      {
        hero: { position: 30, energy: 10, hand: cards("arcaneBlast"), justiceMarks: 1 },
        judge: { position: 35 },
        victim: { position: 40 },
      },
    );
    const { state } = play(start, "hero", "c0", { targetId: "victim" });
    expect(playerOf(state, "victim").position).toBe(40 - ARCANE_BLAST_PUSH);
    expect(playerOf(state, "hero").justiceMarks).toBe(2);
  });

  it("takes a marked attacker's blast at someone else upon herself and turns it", () => {
    const start = withPlayers(armed(newGame(BOARD, { hero: null, judge: "silentVerdict", victim: null })), {
      hero: { position: 30, energy: 10, hand: cards("arcaneBlast") },
      judge: { position: 35 },
      victim: { position: 40, shielded: true },
    });
    const { state, events } = play(start, "hero", "c0", { targetId: "victim" });
    expect(playerOf(state, "victim").position).toBe(40);
    expect(playerOf(state, "hero").position).toBe(30 - ARCANE_BLAST_PUSH * VERDICT_MULTIPLIER);
    expect(eventsOfType(events, "verdictPassed")).toEqual([
      {
        type: "verdictPassed",
        playerId: "judge",
        attackerId: "hero",
        energyGained: VERDICT_ENERGY,
        defendedId: "victim",
        cardId: "arcaneBlast",
      },
    ]);
  });

  it("never marks Themis herself", () => {
    const start = withPlayers(duel(), {
      judge: { energy: 10, hand: cards("arcaneBlast") },
    });
    const { state, events } = play({ ...start, currentPlayerIndex: 1 }, "judge", "c0", { targetId: "hero" });
    expect(playerOf(state, "judge").justiceMarks).toBe(0);
    expect(eventsOfType(events, "justiceMarked")).toEqual([]);
  });

  it("leaves no marks in a match without her", () => {
    const start = withPlayers(newGame(BOARD, { hero: null, rival: null }), {
      hero: { position: 30, energy: 10, hand: cards("arcaneBlast") },
      rival: { position: 35 },
    });
    const { events } = play(start, "hero", "c0", { targetId: "rival" });
    expect(eventsOfType(events, "justiceMarked")).toEqual([]);
  });

  it("sends the one calling the abyss on her down to hell", () => {
    const { state } = play(holding(armed(duel()), "abyssCall"), "hero", "abyssCall", { targetId: "judge" });
    expect(playerOf(state, "hero")).toMatchObject({ position: HELL, realmEntry: { portal: 30, exit: 30 } });
    expect(playerOf(state, "judge").position).toBe(35);
  });

  it("only undoes a Fate Swap", () => {
    const { state, events } = play(holding(armed(duel()), "fateSwap"), "hero", "fateSwap", { targetId: "judge" });
    expect(playerOf(state, "hero").position).toBe(30);
    expect(playerOf(state, "judge")).toMatchObject({ position: 35, abilityCharge: VERDICT_CHARGE });
    expect(eventsOfType(events, "verdictPassed")).toHaveLength(1);
  });

  it("drags the Fallen Angel himself into hell", () => {
    const start = readyAbility(armed(duel("hellsDrag")), "hero");
    const { state } = activate(start, "hero", { targetId: "judge" });
    expect(playerOf(state, "hero").position).toBe(HELL);
    expect(playerOf(state, "judge").position).toBe(35);
  });

  it("makes a winning Jester hand over the cards instead", () => {
    const start = withPlayers(readyAbility(armed(duel("cardGamble")), "hero"), {
      hero: { hand: cards("luckyCharm", "oracleEye", "windStep", "healingHerb", "fateRune", "arcaneShield") },
      judge: { hand: [] },
    });
    const { state, events } = activate(start, "hero", { targetId: "judge" }, [4]);
    expect(playerOf(state, "hero").hand).toHaveLength(6 - CARD_GAMBLE_STOLEN * VERDICT_MULTIPLIER);
    expect(playerOf(state, "judge").hand).toHaveLength(CARD_GAMBLE_STOLEN * VERDICT_MULTIPLIER);
    expect(eventsOfType(events, "verdictPassed")).toEqual([
      {
        type: "verdictPassed",
        playerId: "judge",
        attackerId: "hero",
        energyGained: VERDICT_ENERGY,
        ability: "cardGamble",
      },
    ]);
  });
});

describe("Silent Verdict against lost turns", () => {
  it("unmarked, lets the Blinding Flash and Time Warp strike her", () => {
    const flashed = play(holding(duel(), "blindingFlash"), "hero", "blindingFlash", { targetId: "judge" });
    expect(playerOf(flashed.state, "judge").skipTurns).toBe(1);

    const warped = activate(readyAbility(duel("timeWarp"), "hero"), "hero", { targetId: "judge", power: "halt" });
    expect(playerOf(warped.state, "judge").skipTurns).toBe(TIME_ROUNDS);
  });

  it("armed, turns them on whoever aimed them instead", () => {
    const flashed = play(holding(armed(duel()), "blindingFlash"), "hero", "blindingFlash", { targetId: "judge" });
    expect(playerOf(flashed.state, "judge").skipTurns).toBe(0);
    expect(eventsOfType(flashed.events, "verdictPassed")).toHaveLength(1);
    // Struck before rolling, whoever threw it ends this turn there and then, and loses the next two.
    expect(playerOf(flashed.state, "hero").skipTurns).toBe(VERDICT_MULTIPLIER);
    expect(flashed.state.currentPlayerIndex).toBe(1);

    const warped = activate(readyAbility(armed(duel("timeWarp")), "hero"), "hero", {
      targetId: "judge",
      power: "reverse",
    });
    expect(playerOf(warped.state, "hero").reversedRolls).toBe(TIME_ROUNDS * VERDICT_MULTIPLIER);
    expect(playerOf(warped.state, "judge").reversedRolls).toBe(0);
    expect(eventsOfType(warped.events, "verdictPassed")).toHaveLength(1);
  });
});
