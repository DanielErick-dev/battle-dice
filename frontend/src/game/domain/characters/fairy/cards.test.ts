import { describe, expect, it } from "vitest";
import {
  FROST_BREATH_CHARGE,
  HARVEST_DRAIN,
  SLIDE_REACH,
  ZERO_FREEZE,
  ZERO_RANDOM_TILES,
  ZERO_TRAPS,
  ZERO_WINTER_PUSH,
} from "./cards";
import { ENCHANT_ADVANCE, ENCHANT_FREEZE } from "./snow";
import type { BoardDefinition } from "../../board/board";
import { cards, eventsOfType, expectRuleError, newGame, play, playerOf, withPlayer, withPlayers } from "../../testing";
import type { GameState } from "../../core/state";

/** Eight traps spread along a long plain path. */
const BOARD: BoardDefinition = {
  size: 120,
  effects: Object.fromEntries([20, 30, 40, 50, 60, 70, 80, 90].map((tile) => [tile, { kind: "trap", to: tile - 4 }])),
};

const duel = () => newGame(BOARD, { fairy: "fairyBloom", rival: "doubleCast" });
const trio = () => newGame(BOARD, { fairy: "fairyBloom", rival: "doubleCast", third: "doubleCast" });
const holding = (state: GameState, ...ids: Parameters<typeof cards>) =>
  withPlayer(state, "fairy", { hand: cards(...ids), energy: 10 });
const snowAt = (state: GameState, ...tiles: number[]): GameState => ({
  ...state,
  enchantedTiles: tiles.map((tile) => ({ tile, owner: "fairy" })),
});
const snowTiles = (state: GameState) => state.enchantedTiles.map(({ tile }) => tile).sort((a, b) => a - b);

describe("the Crystal Fairy's cards", () => {
  it(`Frost Breath: her own tile under snow for good and +${FROST_BREATH_CHARGE} charge`, () => {
    const start = withPlayer(holding(duel(), "frostBreath"), "fairy", { position: 15, abilityCharge: 0 });
    const { state } = play(start, "fairy", "c0");
    expect(snowTiles(state)).toEqual([15]);
    expect(playerOf(state, "fairy").abilityCharge).toBe(FROST_BREATH_CHARGE);
  });

  it(`Slippery Track: an opponent within ${SLIDE_REACH} of her snow slides onto it and is snowed in`, () => {
    const start = withPlayers(snowAt(holding(duel(), "slipperyTrack"), 30), {
      rival: { position: 30 - SLIDE_REACH },
    });
    const { state } = play(start, "fairy", "c0", { targetId: "rival" });
    expect(playerOf(state, "rival")).toMatchObject({ position: 30, skipTurns: ENCHANT_FREEZE });
    expect(playerOf(state, "rival").snowbound?.owner).toBe("fairy");
  });

  it("Slippery Track can't pick anyone too far from her snow", () => {
    const start = withPlayers(snowAt(holding(duel(), "slipperyTrack"), 30), {
      rival: { position: 30 + SLIDE_REACH + 1 },
    });
    expectRuleError(() => play(start, "fairy", "c0", { targetId: "rival" }), "INVALID_TARGET");
  });

  it(`Crystal Wings: she flies to her next snow ahead and it carries her ${ENCHANT_ADVANCE} on`, () => {
    const start = withPlayer(snowAt(holding(duel(), "crystalWings"), 22), "fairy", { position: 15 });
    const { state } = play(start, "fairy", "c0");
    expect(playerOf(state, "fairy").position).toBe(22 + ENCHANT_ADVANCE);
  });

  it("Crystal Wings needs her snow within reach ahead", () => {
    const start = withPlayer(snowAt(holding(duel(), "crystalWings"), 40), "fairy", { position: 15 });
    expectRuleError(() => play(start, "fairy", "c0"), "NO_SNOW_AHEAD");
  });

  it(`Glacial Harvest: a card from each one snowed in, or ${HARVEST_DRAIN} energy from an empty hand`, () => {
    const snowbound = { owner: "fairy", rounds: 2 };
    const start = withPlayers(holding(trio(), "glacialHarvest"), {
      rival: { snowbound, skipTurns: 2, hand: cards("windStep") },
      third: { snowbound, skipTurns: 2, hand: [], energy: 5 },
    });
    const { state } = play(start, "fairy", "c0");
    expect(playerOf(state, "rival").hand).toHaveLength(0);
    expect(playerOf(state, "fairy").hand.map((card) => card.cardId)).toEqual(["windStep"]);
    expect(playerOf(state, "third").energy).toBe(5 - HARVEST_DRAIN);
  });

  it("Glacial Harvest needs someone stuck in the snow", () => {
    expectRuleError(() => play(holding(duel(), "glacialHarvest"), "fairy", "c0"), "NO_SNOWBOUND");
  });

  it(`Absolute Zero before winter: everyone frozen ${ZERO_FREEZE} rounds, ${ZERO_TRAPS} traps and a tile snowed`, () => {
    const start = withPlayers(holding(trio(), "absoluteZero"), {
      fairy: { position: 10 },
      rival: { position: 35 },
      third: { position: 55, spectralArmour: 2 },
    });
    const { state, events } = play(start, "fairy", "c0");
    expect(playerOf(state, "rival")).toMatchObject({ skipTurns: ZERO_FREEZE, position: 35 });
    expect(playerOf(state, "third").skipTurns).toBe(0);
    expect(eventsOfType(events, "absoluteZero")[0]).toMatchObject({ frozen: ["rival"] });
    const snowed = snowTiles(state);
    expect(snowed).toHaveLength(ZERO_TRAPS + ZERO_RANDOM_TILES);
    expect(snowed.filter((tile) => tile % 10 === 0 && tile >= 20 && tile <= 90)).toEqual([20, 30, 40, 50, 60, 70]);
  });

  it(`Absolute Zero in Eternal Winter pushes the ice ${ZERO_WINTER_PUSH} past where it had reached`, () => {
    const start = withPlayer(
      { ...holding(duel(), "absoluteZero"), winter: { owner: "fairy", frontier: 30, iced: [] } },
      "fairy",
      { position: 5 },
    );
    const { state } = play(start, "fairy", "c0");
    expect(state.winter?.frontier).toBe(30 + ZERO_WINTER_PUSH);
    expect(state.enchantedTiles).toEqual([]);
  });
});
