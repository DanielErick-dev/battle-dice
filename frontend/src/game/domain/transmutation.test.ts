import { describe, expect, it } from "vitest";
import { ABILITY_CYCLE, TRANSMUTATION_CARDS, TRANSMUTATION_FALLBACK_LEVEL, abilityCycle } from "./abilities";
import { CARD_CATALOG, MAX_RARITY_LEVEL, rarityLevel } from "./cards";
import {
  TRAP_AND_CURSE_BOARD,
  activate,
  cards,
  expectRuleError,
  newGame,
  playerOf,
  readyAbility,
  withPlayer,
} from "./testing";
import { transmutationLevel, transmutationPool } from "./transmutation";
import type { CardInstance, GameState } from "./types";

const transmute = (state: GameState, ...cardUids: string[]) => activate(state, "p1", { cardUids });
/** A charged alchemist holding `ids`, with uids `c0`, `c1`… */
const holding = (...ids: CardInstance["cardId"][]) =>
  withPlayer(readyAbility(newGame(TRAP_AND_CURSE_BOARD, { p1: "transmutation" }), "p1"), "p1", { hand: cards(...ids) });

describe("Transmutation", () => {
  it("sacrifices two cards for one of their levels added up, in the first one's place", () => {
    // Two uncommon (level 2) cards make an epic (level 4).
    const { state, events } = transmute(holding("windStep", "arcaneShield", "oracleEye"), "c1", "c2");
    const { hand, abilityCharge } = playerOf(state, "p1");
    const [kept, changed] = hand;
    expect(hand).toHaveLength(2);
    expect(kept).toEqual({ uid: "c0", cardId: "windStep" });
    expect(CARD_CATALOG[changed.cardId].rarity).toBe("epic");
    expect(events).toContainEqual({
      type: "cardTransmuted",
      playerId: "p1",
      from: { uid: "c1", cardId: "arcaneShield" },
      sacrificed: { uid: "c2", cardId: "oracleEye" },
      to: changed,
    });
    expect(abilityCharge).toBe(0);
  });

  it("adds the levels up to the highest one", () => {
    expect(transmutationLevel(["windStep", "healingHerb"])).toBe(2);
    expect(transmutationLevel(["windStep", "mysticGate"])).toBe(MAX_RARITY_LEVEL);
    expect(transmutationLevel(["fateRune", "mysticGate"])).toBe(MAX_RARITY_LEVEL);
  });

  it(`takes exactly ${TRANSMUTATION_CARDS} cards`, () => {
    const hand = holding("windStep", "healingHerb", "luckyCharm");
    expectRuleError(() => transmute(hand, "c0"), "UNKNOWN_CARD");
    expectRuleError(() => transmute(hand, "c0", "c1", "c2"), "UNKNOWN_CARD");
    expectRuleError(() => transmute(hand, "c0", "nope"), "UNKNOWN_CARD");
  });

  it(`with fewer than ${TRANSMUTATION_CARDS} cards in hand, distils one of level ${TRANSMUTATION_FALLBACK_LEVEL}`, () => {
    const { hand } = playerOf(transmute(holding("windStep")).state, "p1");
    expect(hand).toHaveLength(2);
    expect(rarityLevel(hand[1].cardId)).toBe(TRANSMUTATION_FALLBACK_LEVEL);
  });

  it("charges over the short cycle", () => {
    expect(abilityCycle("transmutation")).toBe(ABILITY_CYCLE);
  });

  it("gives relics at the top level, and never a card that needs an opponent when playing alone", () => {
    expect(transmutationPool(MAX_RARITY_LEVEL, false)).toEqual(["celestialLight", "heavenlyAegis", "ascension"]);
    expect(transmutationPool(MAX_RARITY_LEVEL, true)).toContain("fateSwap");
    expect(transmutationPool(2, false)).not.toContain("arcaneBlast");
  });
});
