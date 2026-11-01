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
  roll,
  withPlayer,
  withPlayers,
} from "../../testing";
import type { GameState } from "../../core/state";
import { BLIND_SCALE_ENERGY } from "./verdict";

/** Hell through the portal on 50 (out at 55); hell's first tile is 61. */
const BOARD: BoardDefinition = { size: 60, effects: { 50: { kind: "portal", to: 55, realm: "infernal" } } };
const HELL = 61;

/** The hero aims at Themis ("judge"), a few tiles ahead of them. */
const duel = (heroAbility: Parameters<typeof abilityCycle>[0] = "studySession") =>
  withPlayers(newGame(BOARD, { hero: heroAbility, judge: "silentVerdict" }), {
    hero: { position: 30, energy: 10 },
    judge: { position: 35 },
  });
const armed = (state: GameState) => readyAbility(state, "judge");
const holding = (state: GameState, ...ids: Parameters<typeof card>[0][]) =>
  withPlayer(state, "hero", { hand: ids.map((id) => card(id, id)) });

describe("Silent Verdict", () => {
  it("charges in its own cycle and can't be used by hand", () => {
    expect(abilityCycle("silentVerdict")).toBe(VERDICT_CYCLE);
    const start = { ...armed(duel()), currentPlayerIndex: 1 };
    expectRuleError(() => activate(start, "judge"), "ABILITY_REACTIVE");
  });

  it("armed, turns an Arcane Blast on whoever threw it, and is spent", () => {
    const { state, events } = play(holding(armed(duel()), "arcaneBlast"), "hero", "arcaneBlast", {
      targetId: "judge",
    });
    expect(playerOf(state, "judge")).toMatchObject({ position: 35, abilityCharge: 0 });
    expect(playerOf(state, "hero").position).toBe(30 - ARCANE_BLAST_PUSH);
    expect(events).toContainEqual({
      type: "verdictPassed",
      playerId: "judge",
      attackerId: "hero",
      cardId: "arcaneBlast",
    });
  });

  it("unarmed, lets the blast through", () => {
    const { state, events } = play(holding(duel(), "arcaneBlast"), "hero", "arcaneBlast", { targetId: "judge" });
    expect(playerOf(state, "judge").position).toBe(35 - ARCANE_BLAST_PUSH);
    expect(eventsOfType(events, "verdictPassed")).toEqual([]);
  });

  it("sends the one calling the abyss on her down to hell", () => {
    const { state } = play(holding(armed(duel()), "abyssCall"), "hero", "abyssCall", { targetId: "judge" });
    expect(playerOf(state, "hero")).toMatchObject({ position: HELL, realmEntry: { portal: 30, exit: 30 } });
    expect(playerOf(state, "judge").position).toBe(35);
  });

  it("only undoes a Fate Swap", () => {
    const { state, events } = play(holding(armed(duel()), "fateSwap"), "hero", "fateSwap", { targetId: "judge" });
    expect(playerOf(state, "hero").position).toBe(30);
    expect(playerOf(state, "judge")).toMatchObject({ position: 35, abilityCharge: 0 });
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
      hero: { hand: cards("luckyCharm", "oracleEye", "windStep") },
      judge: { hand: [] },
    });
    const { state, events } = activate(start, "hero", { targetId: "judge" }, [4]);
    expect(playerOf(state, "hero").hand).toHaveLength(3 - CARD_GAMBLE_STOLEN);
    expect(playerOf(state, "judge").hand).toHaveLength(CARD_GAMBLE_STOLEN);
    expect(eventsOfType(events, "verdictPassed")).toEqual([
      { type: "verdictPassed", playerId: "judge", attackerId: "hero", ability: "cardGamble" },
    ]);
  });
});

describe("Silent Verdict against lost turns", () => {
  it("unarmed, lets the Blinding Flash and Time Warp strike her", () => {
    const flashed = play(holding(duel(), "blindingFlash"), "hero", "blindingFlash", { targetId: "judge" });
    expect(playerOf(flashed.state, "judge").skipTurns).toBe(1);

    const warped = activate(readyAbility(duel("timeWarp"), "hero"), "hero", { targetId: "judge", power: "halt" });
    expect(playerOf(warped.state, "judge").skipTurns).toBe(TIME_ROUNDS);
  });

  it("armed, turns them on whoever aimed them instead", () => {
    const flashed = play(holding(armed(duel()), "blindingFlash"), "hero", "blindingFlash", { targetId: "judge" });
    expect(playerOf(flashed.state, "judge").skipTurns).toBe(0);
    expect(eventsOfType(flashed.events, "verdictPassed")).toHaveLength(1);
    // Struck before rolling, whoever threw it ends this turn there and then, and loses the next.
    expect(playerOf(flashed.state, "hero").skipTurns).toBe(1);
    expect(flashed.state.currentPlayerIndex).toBe(1);

    const warped = activate(readyAbility(armed(duel("timeWarp")), "hero"), "hero", {
      targetId: "judge",
      power: "reverse",
    });
    expect(playerOf(warped.state, "hero").reversedRolls).toBe(TIME_ROUNDS);
    expect(playerOf(warped.state, "judge").reversedRolls).toBe(0);
    expect(eventsOfType(warped.events, "verdictPassed")).toHaveLength(1);
  });
});

describe("Blind Scale", () => {
  it("takes apart the hidden traps on her way, for energy, and lands safe on one", () => {
    const start = {
      ...withPlayer(duel(), "judge", { position: 10, energy: 2 }),
      hiddenTraps: [12, 14, 40],
      currentPlayerIndex: 1,
    };
    const { state, events } = roll(start, "judge", 4);
    expect(state.hiddenTraps).toEqual([40]);
    expect(playerOf(state, "judge")).toMatchObject({ position: 14, energy: 2 + 2 * BLIND_SCALE_ENERGY });
    expect(eventsOfType(events, "hiddenTrapDisarmed").map((event) => event.tile)).toEqual([12, 14]);
    expect(eventsOfType(events, "hiddenTrapSprung")).toEqual([]);
  });

  it("is hers alone: others still spring hidden traps", () => {
    const start = { ...withPlayer(duel(), "hero", { position: 10 }), hiddenTraps: [12] };
    const { events } = roll(start, "hero", 2);
    expect(eventsOfType(events, "hiddenTrapSprung")).toHaveLength(1);
  });
});
