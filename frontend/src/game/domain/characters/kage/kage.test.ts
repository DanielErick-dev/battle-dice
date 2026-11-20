import { describe, expect, it } from "vitest";
import {
  BLOOD_TEAR_CHARGE,
  BREEZE_BURNS,
  BREEZE_STEP,
  BREEZE_TURNS,
  MIRAGE_REACH,
  SWORD_PUSH,
  SWORD_STEP,
  SWORD_SUSANOO_STEP,
  SWORD_SUSANOO_TURNS,
} from "./cards";
import { ARMOUR_TURNS, FLAME_ENERGY, FLAME_HITS, FLAME_PUSH, FLAME_TURNS } from "./flames";
import type { BoardDefinition } from "../../board/board";
import { cards, eventsOfType, expectRuleError, newGame, play, playerOf, withPlayer, withPlayers } from "../../testing";
import type { GameState } from "../../core/state";
import type { BlackFlame } from "./types";

const BOARD: BoardDefinition = { size: 120, effects: {} };

const duel = () => newGame(BOARD, { kage: "ocularAwakening", rival: "doubleCast" });
const trio = () => newGame(BOARD, { kage: "ocularAwakening", rival: "doubleCast", third: "doubleCast" });
const holding = (state: GameState, ...ids: Parameters<typeof cards>) =>
  withPlayer(state, "kage", { hand: cards(...ids), energy: 10 });
const fire = (tile: number, extra: Partial<BlackFlame> = {}): BlackFlame => ({
  tile,
  owner: "kage",
  turnsLeft: FLAME_TURNS,
  burnsLeft: FLAME_HITS,
  ...extra,
});
const fireTiles = (state: GameState) => state.blackFlames.map((flame) => flame.tile).sort((a, b) => a - b);

describe("Kage Rubra's cards", () => {
  it(`Tear of Blood: +${BLOOD_TEAR_CHARGE} charge and a black fire right behind her`, () => {
    const start = withPlayer(holding(duel(), "bloodTear"), "kage", { position: 20, abilityCharge: 1 });
    const { state } = play(start, "kage", "c0");
    expect(playerOf(state, "kage").abilityCharge).toBe(1 + BLOOD_TEAR_CHARGE);
    expect(fireTiles(state)).toEqual([19]);
  });

  it(`Scarlet Mirage pulls an opponent within ${MIRAGE_REACH} of her fire onto it, burning them`, () => {
    const start = withPlayers(
      { ...holding(duel(), "scarletMirage"), blackFlames: [fire(30)] },
      {
        kage: { position: 5 },
        rival: { position: 30 + MIRAGE_REACH, energy: 5 },
      },
    );
    const { state } = play(start, "kage", "c0", { targetId: "rival" });
    expect(playerOf(state, "rival")).toMatchObject({ position: 30 - FLAME_PUSH, energy: 5 - FLAME_ENERGY });
    expect(state.blackFlames[0]?.burnsLeft).toBe(FLAME_HITS - 1);
  });

  it("Scarlet Mirage can't pick anyone too far from her fire", () => {
    const start = withPlayers(
      { ...holding(duel(), "scarletMirage"), blackFlames: [fire(30)] },
      {
        rival: { position: 30 + MIRAGE_REACH + 1 },
      },
    );
    expectRuleError(() => play(start, "kage", "c0", { targetId: "rival" }), "INVALID_TARGET");
  });

  it("Scarlet Mirage is blocked by armour and the target stays put", () => {
    const start = withPlayers(
      { ...holding(duel(), "scarletMirage"), blackFlames: [fire(30)] },
      {
        rival: { position: 32, spectralArmour: 2 },
      },
    );
    const { state, events } = play(start, "kage", "c0", { targetId: "rival" });
    expect(eventsOfType(events, "cardBlocked")).toHaveLength(1);
    expect(playerOf(state, "rival").position).toBe(32);
  });

  it(`Amaterasu's Breeze: +${BREEZE_TURNS} rounds and +${BREEZE_BURNS} burns, spreads ahead, walks per fire`, () => {
    const start = withPlayer(
      { ...holding(duel(), "amaterasuBreeze"), blackFlames: [fire(40, { turnsLeft: 1, burnsLeft: 1 }), fire(60)] },
      "kage",
      { position: 10 },
    );
    const { state } = play(start, "kage", "c0");
    expect(fireTiles(state)).toEqual([40, 41, 60, 61]);
    const old = state.blackFlames.find((flame) => flame.tile === 40);
    expect(old).toMatchObject({ turnsLeft: 1 + BREEZE_TURNS, burnsLeft: 1 + BREEZE_BURNS });
    expect(state.blackFlames.find((flame) => flame.tile === 41)).toMatchObject({ burnsLeft: FLAME_HITS });
    expect(playerOf(state, "kage").position).toBe(10 + 4 * BREEZE_STEP);
  });

  it("Amaterasu's Breeze needs black fire on the board", () => {
    expectRuleError(() => play(holding(duel(), "amaterasuBreeze"), "kage", "c0"), "NO_BLACK_FIRE");
  });

  it(`Susanoo's Sword: walks ${SWORD_STEP} and raises the Susanoo until her next turn`, () => {
    const start = withPlayer(holding(duel(), "susanooSword"), "kage", { position: 10 });
    const { state } = play(start, "kage", "c0");
    expect(playerOf(state, "kage")).toMatchObject({ position: 10 + SWORD_STEP, spectralArmour: SWORD_SUSANOO_TURNS });
  });

  it(`Susanoo's Sword inside the Susanoo walks ${SWORD_SUSANOO_STEP} and throws back whoever she passes`, () => {
    const start = withPlayers(holding(trio(), "susanooSword"), {
      kage: { position: 10, spectralArmour: 2 },
      rival: { position: 13 },
      third: { position: 13, spectralArmour: 2 },
    });
    const { state } = play(start, "kage", "c0");
    expect(playerOf(state, "kage").position).toBe(10 + SWORD_SUSANOO_STEP);
    expect(playerOf(state, "rival").position).toBe(13 - SWORD_PUSH);
    expect(playerOf(state, "third").position).toBe(13);
  });

  it("Eternal Eclipse: long Susanoo, two fires ahead of each opponent, the two leaders burnt", () => {
    const start = withPlayers(holding(trio(), "eternalEclipse"), {
      kage: { position: 5 },
      rival: { position: 50, energy: 5 },
      third: { position: 30, energy: 5 },
    });
    const { state } = play(start, "kage", "c0");
    expect(playerOf(state, "kage").spectralArmour).toBe(ARMOUR_TURNS);
    // Each walked into the nearest fire (2 ahead) and was thrown back from it.
    expect(playerOf(state, "rival")).toMatchObject({ position: 52 - FLAME_PUSH, energy: 5 - FLAME_ENERGY });
    expect(playerOf(state, "third")).toMatchObject({ position: 32 - FLAME_PUSH, energy: 5 - FLAME_ENERGY });
    expect(fireTiles(state)).toEqual([32, 33, 52, 53]);
  });
});
