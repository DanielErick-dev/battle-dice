import { describe, expect, it } from "vitest";
import {
  BURN_ROUNDS,
  FIRE_TOLL,
  FIRE_ZONE_RANGE,
  IMPETUS_BONUS,
  IMPETUS_PUSH,
  IMPETUS_ROLLS,
  INNER_FLAME_MAX,
  SCARLET_ROUNDS,
} from "./fire";
import { EMBER_SLIDE, FEVER_SPREAD, HOT_BLOOD_PUSH, SUPERNOVA_STEP } from "./cards";
import { abilityCycle, LONG_ABILITY_CYCLE } from "../../abilities/charge";
import type { BoardDefinition } from "../../board/board";
import {
  activate,
  card,
  cards,
  eventsOfType,
  expectRuleError,
  newGame,
  onTurnOf,
  play,
  playerOf,
  readyAbility,
  roll,
  send,
  withPlayer,
  withPlayers,
} from "../../testing";
import type { GameState } from "../../core/state";

/** A trap at 40 (back to 36) and another at 70 (back to 66) on a long plain path. */
const BOARD: BoardDefinition = {
  size: 120,
  effects: { 40: { kind: "trap", to: 36 }, 70: { kind: "trap", to: 66 } },
};

const duel = () => newGame(BOARD, { akane: "fireZone", rival: "doubleCast" });
const trio = () => newGame(BOARD, { akane: "fireZone", rival: "doubleCast", third: "doubleCast" });
const scarletTiles = (state: GameState) => state.scarletFlames.map((flame) => flame.tile);
/** Akane at 10 sets the 20 tiles ahead alight. */
const zoneLit = (start = duel()) =>
  activate(readyAbility(withPlayer(start, "akane", { position: 10 }), "akane"), "akane");
const rivalRolls = (state: GameState, die: number) => roll(onTurnOf(state, "rival"), "rival", die);

describe("Fire Zone", () => {
  it(`charges in ${LONG_ABILITY_CYCLE} turns and sets the ${FIRE_ZONE_RANGE} tiles ahead alight`, () => {
    expect(abilityCycle("fireZone")).toBe(LONG_ABILITY_CYCLE);
    const { state } = zoneLit();
    expect(scarletTiles(state)).toEqual(Array.from({ length: FIRE_ZONE_RANGE }, (_, index) => 11 + index));
  });

  it("sets whoever stands in it on fire, never Akane", () => {
    const { state, events } = zoneLit(withPlayer(duel(), "rival", { position: 15 }));
    expect(playerOf(state, "rival").burning).toBe(BURN_ROUNDS);
    expect(playerOf(state, "akane").burning).toBe(0);
    expect(eventsOfType(events, "playerIgnited")).toEqual([
      { type: "playerIgnited", playerId: "rival", by: "akane", rounds: BURN_ROUNDS, tile: 15 },
    ]);
  });

  it(`burns for ${SCARLET_ROUNDS} whole rounds after the one it's lit in`, () => {
    let state = roll(zoneLit().state, "akane", 1).state;
    state = rivalRolls(state, 6).state;
    for (let round = 1; round < SCARLET_ROUNDS; round++) {
      state = rivalRolls(roll(state, "akane", 1).state, 6).state;
    }
    expect(state.scarletFlames.length).toBeGreaterThan(0);
    const last = roll(state, "akane", 1);
    expect(last.state.scarletFlames).toEqual([]);
    expect(eventsOfType(last.events, "scarletFaded")).toHaveLength(1);
  });

  it("stopping on it sets an opponent alight and the tile underneath does nothing", () => {
    const start = withPlayers(duel(), { akane: { position: 35 }, rival: { position: 34 } });
    const lit = activate(readyAbility(start, "akane"), "akane").state;
    const { state } = rivalRolls(lit, 6);
    expect(playerOf(state, "rival")).toMatchObject({ position: 40, burning: BURN_ROUNDS });
  });
});

describe("On fire", () => {
  const burning = (die: number, position = 50) =>
    rivalRolls(withPlayer(duel(), "rival", { position, burning: BURN_ROUNDS }), die);

  it("halves the roll, rounded down", () => {
    expect(playerOf(burning(5).state, "rival").position).toBe(52);
    expect(eventsOfType(burning(5).events, "diceRolled")[0]).toMatchObject({ value: 2, halved: true });
  });

  it("halves the bonuses too: the whole walk", () => {
    const boosted = withPlayer(duel(), "rival", {
      position: 50,
      burning: BURN_ROUNDS,
      diceBonuses: [{ amount: 3, rolls: 1 }],
    });
    expect(playerOf(rivalRolls(boosted, 6).state, "rival").position).toBe(54);
  });

  it("a 1 doesn't move them, and the tile they stand on doesn't act again", () => {
    const { state, events } = burning(1, 40);
    expect(playerOf(state, "rival").position).toBe(40);
    expect(eventsOfType(events, "trapTriggered")).toEqual([]);
  });

  it(`wears off after ${BURN_ROUNDS} of their own turns`, () => {
    let state = burning(4).state;
    expect(playerOf(state, "rival").burning).toBe(BURN_ROUNDS - 1);
    state = rivalRolls(state, 4).state;
    expect(playerOf(state, "rival").burning).toBe(0);
  });

  it("caught on their own roll, the turn ending doesn't count as one of the rounds", () => {
    const fire = { ...zoneLit().state, currentPlayerIndex: 1 };
    const { state } = roll(withPlayer(fire, "rival", { position: 8 }), "rival", 4);
    expect(playerOf(state, "rival").burning).toBe(BURN_ROUNDS);
  });

  it("gains no energy, from the turn or anything else", () => {
    const start = withPlayer(duel(), "rival", { burning: BURN_ROUNDS, energy: 3, energyCharge: 1 });
    const { state } = roll(start, "akane", 6);
    expect(playerOf(state, "rival").energy).toBe(3);
  });

  it("the Healing Herb puts it out", () => {
    const start = withPlayer(onTurnOf(duel(), "rival"), "rival", {
      burning: BURN_ROUNDS,
      energy: 2,
      hand: [card("healingHerb")],
    });
    const { state } = play(start, "rival", "test:healingHerb");
    expect(playerOf(state, "rival").burning).toBe(0);
    expect(playerOf(state, "rival").energy).toBeGreaterThan(1);
  });
});

describe("Scarlet fire against the elements", () => {
  it("melts the fairy's snow; the trap under it is back once the fire dies", () => {
    const snowed = { ...duel(), enchantedTiles: [{ tile: 40, owner: "rival" }] };
    const lit = activate(readyAbility(withPlayer(snowed, "akane", { position: 30 }), "akane"), "akane");
    expect(lit.state.enchantedTiles).toEqual([]);
    expect(eventsOfType(lit.events, "scarletLit")[0].melted).toEqual([40]);
    const out = { ...lit.state, scarletFlames: [] };
    const { state } = rivalRolls(withPlayer(out, "rival", { position: 36 }), 4);
    expect(playerOf(state, "rival").position).toBe(36);
  });

  it("melts Eternal Winter's ice too, and the winter can't freeze it back while it burns", () => {
    const winter = { ...duel(), winter: { owner: "rival", frontier: 20, iced: [35] } };
    const { state } = activate(readyAbility(withPlayer(winter, "akane", { position: 10 }), "akane"), "akane");
    expect(state.winter?.thawed).toEqual(expect.arrayContaining([11, 20]));
    expect(state.winter?.iced).toEqual([35]);
    const next = rivalRolls(roll(state, "akane", 1).state, 1).state;
    expect(next.winter?.thawed).toEqual(expect.arrayContaining([21, 26]));
  });

  it("Auric's tide drowns the fire and puts out whoever burns in its reach", () => {
    const start = withPlayers(newGame(BOARD, { akane: "fireZone", rival: "cleansingTide" }), {
      akane: { position: 10, burning: 0 },
      rival: { position: 12, burning: BURN_ROUNDS },
    });
    const lit = zoneLit(start).state;
    const { state, events } = activate(readyAbility(onTurnOf(lit, "rival"), "rival"), "rival");
    expect(scarletTiles(state)).toEqual([11]);
    expect(playerOf(state, "rival").burning).toBe(0);
    expect(eventsOfType(events, "fireQuenched")).toHaveLength(1);
  });
});

describe("Brilliant Impetus", () => {
  it("a 1 or a 2 kindles an Inner Flame, a 3 doesn't", () => {
    expect(playerOf(roll(duel(), "akane", 2).state, "akane").innerFlame).toBe(1);
    expect(playerOf(roll(duel(), "akane", 3).state, "akane").innerFlame).toBe(0);
  });

  it("a trap kindles one too", () => {
    const { state } = roll(withPlayer(duel(), "akane", { position: 36 }), "akane", 4);
    expect(playerOf(state, "akane").innerFlame).toBe(1);
  });

  it(`stops at ${INNER_FLAME_MAX}`, () => {
    const full = withPlayer(duel(), "akane", { innerFlame: INNER_FLAME_MAX, impetusRolls: 0 });
    const unleashed = roll(full, "akane", 1);
    expect(eventsOfType(unleashed.events, "impetusUnleashed")).toHaveLength(1);
    expect(playerOf(unleashed.state, "akane").innerFlame).toBe(0);
  });

  it(`full, his next ${IMPETUS_ROLLS} rolls walk ${IMPETUS_BONUS} further and gather no flames`, () => {
    let state = withPlayer(duel(), "akane", { position: 1, innerFlame: INNER_FLAME_MAX });
    state = roll(state, "akane", 1).state;
    expect(playerOf(state, "akane")).toMatchObject({ position: 2 + IMPETUS_BONUS, innerFlame: 0 });
    state = rivalRolls(state, 1).state;
    state = roll(state, "akane", 2).state;
    expect(playerOf(state, "akane")).toMatchObject({ position: 7 + IMPETUS_BONUS, impetusRolls: 0, innerFlame: 0 });
    state = rivalRolls(state, 1).state;
    const after = playerOf(roll(state, "akane", 2).state, "akane");
    expect(after).toMatchObject({ position: 12, innerFlame: 1 });
  });

  it(`whoever he runs through catches fire and is thrown ${IMPETUS_PUSH} back`, () => {
    const start = withPlayers(duel(), {
      akane: { position: 10, innerFlame: INNER_FLAME_MAX },
      rival: { position: 12 },
    });
    const { state, events } = roll(start, "akane", 3);
    expect(playerOf(state, "rival")).toMatchObject({ position: 12 - IMPETUS_PUSH, burning: BURN_ROUNDS });
    expect(eventsOfType(events, "playerTrampled")[0]).toMatchObject({ playerId: "rival", burning: true });
  });

  it("without the Impetus he walks past others harmlessly", () => {
    const start = withPlayers(duel(), { akane: { position: 10 }, rival: { position: 12 } });
    expect(playerOf(roll(start, "akane", 3).state, "rival")).toMatchObject({ position: 12, burning: 0 });
  });
});

describe("Akane's cards", () => {
  const holding = (state: GameState, ...ids: Parameters<typeof cards>) =>
    withPlayer(state, "akane", { hand: cards(...ids), energy: 10 });

  it(`Hot Blood throws everyone within 7 back ${HOT_BLOOD_PUSH} per flame, and spends them`, () => {
    const start = withPlayers(holding(trio(), "hotBlood"), {
      akane: { position: 50, innerFlame: 2 },
      rival: { position: 57 },
      third: { position: 40 },
    });
    const { state } = play(start, "akane", "c0");
    expect(playerOf(state, "rival").position).toBe(57 - 2 * HOT_BLOOD_PUSH);
    expect(playerOf(state, "third").position).toBe(40);
    expect(playerOf(state, "akane").innerFlame).toBe(0);
  });

  it("Hot Blood can't be played with no Inner Flame", () => {
    expectRuleError(() => play(holding(duel(), "hotBlood"), "akane", "c0"), "NO_INNER_FLAME");
  });

  it(`Ember Step: a roll stopping on fire slides ${EMBER_SLIDE} further`, () => {
    const lit = holding(zoneLit().state, "emberStep");
    const stepped = play(onTurnOf(lit, "akane"), "akane", "c0").state;
    const { state, events } = roll(stepped, "akane", 4);
    expect(playerOf(state, "akane").position).toBe(14 + EMBER_SLIDE);
    expect(eventsOfType(events, "emberSlid")).toHaveLength(1);
  });

  it(`Scarlet Fever sets the leader alight with ${FEVER_SPREAD} tiles burning on each side`, () => {
    const start = withPlayers(holding(trio(), "scarletFever"), {
      akane: { position: 10 },
      rival: { position: 50 },
      third: { position: 30 },
    });
    const { state } = play(start, "akane", "c0");
    expect(playerOf(state, "rival").burning).toBe(BURN_ROUNDS);
    expect(playerOf(state, "third").burning).toBe(0);
    expect(scarletTiles(state)).toEqual(Array.from({ length: 2 * FEVER_SPREAD + 1 }, (_, index) => 45 + index));
  });

  it("Scarlet Fever is blocked by a protected leader, and nothing catches", () => {
    const start = withPlayers(holding(duel(), "scarletFever"), { rival: { position: 50, spectralArmour: 2 } });
    const { state, events } = play(start, "akane", "c0");
    expect(eventsOfType(events, "cardBlocked")).toHaveLength(1);
    expect(state.scarletFlames).toEqual([]);
  });

  it("Pure Fuel throws two dice while an opponent burns", () => {
    const fuelled = play(holding(duel(), "pureFuel"), "akane", "c0").state;
    const burning = withPlayers(fuelled, { akane: { position: 1 }, rival: { burning: BURN_ROUNDS } });
    const { state } = send(burning, { type: "rollDice", playerId: "akane" }, [3, 4]);
    expect(playerOf(state, "akane").position).toBe(8);
    const calm = send(withPlayer(fuelled, "akane", { position: 1 }), { type: "rollDice", playerId: "akane" }, [3, 4]);
    expect(playerOf(calm.state, "akane").position).toBe(4);
  });

  it(`Scarlet Supernova takes every fire back and walks ${SUPERNOVA_STEP} per fire, uncapped`, () => {
    const lit = withPlayer(zoneLit().state, "rival", { position: 100, burning: BURN_ROUNDS });
    const start = holding(onTurnOf(lit, "akane"), "scarletSupernova", "windStep");
    const { state, events } = send(start, {
      type: "playCard",
      playerId: "akane",
      cardUid: "c0",
      sacrificeUids: ["c1"],
    });
    const tiles = (FIRE_ZONE_RANGE + 1) * SUPERNOVA_STEP;
    expect(eventsOfType(events, "supernova")[0]).toMatchObject({ fires: FIRE_ZONE_RANGE, burning: 1, tiles });
    expect(playerOf(state, "akane").position).toBe(10 + tiles);
    expect(state.scarletFlames).toEqual([]);
    expect(playerOf(state, "rival").burning).toBe(0);
  });

  it("Scarlet Supernova can't be played with no fire anywhere", () => {
    expectRuleError(() => play(holding(duel(), "scarletSupernova", "windStep"), "akane", "c0"), "NO_FIRE");
  });
});

describe("Fire Zone charge", () => {
  it("doesn't charge again while any of his scarlet fire still burns, then does", () => {
    let state = roll(zoneLit().state, "akane", 1).state;
    state = rivalRolls(state, 6).state;
    expect(playerOf(state, "akane").abilityCharge).toBe(0);
    while (state.scarletFlames.length > 0) state = rivalRolls(roll(state, "akane", 1).state, 6).state;
    expect(playerOf(state, "akane").abilityCharge).toBe(1);
  });
});

describe("Fire toll", () => {
  it(`each round on fire hands ${FIRE_TOLL} energy from the one burning to Akane`, () => {
    const lit = zoneLit(withPlayers(duel(), { rival: { position: 15, energy: 4 }, akane: { energy: 2 } })).state;
    const akaneEnergy = playerOf(lit, "akane").energy;
    const afterAkane = roll(lit, "akane", 1).state;
    const { state, events } = rivalRolls(afterAkane, 6);
    expect(eventsOfType(events, "fireFed")).toEqual([
      { type: "fireFed", playerId: "rival", by: "akane", energy: FIRE_TOLL },
    ]);
    expect(playerOf(state, "rival").energy).toBe(4 - FIRE_TOLL);
    expect(playerOf(state, "akane").energy).toBeGreaterThanOrEqual(akaneEnergy + FIRE_TOLL);
  });

  it("Akane still gains when the one burning has no energy left", () => {
    const lit = zoneLit(withPlayers(duel(), { rival: { position: 15, energy: 0 } })).state;
    const { events } = rivalRolls(roll(lit, "akane", 1).state, 6);
    expect(eventsOfType(events, "fireFed")).toEqual([{ type: "fireFed", playerId: "rival", by: "akane", energy: 0 }]);
  });
});
