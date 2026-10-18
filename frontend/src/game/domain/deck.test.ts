import { describe, expect, it } from "vitest";
import { CARD_CATALOG, HAND_LIMIT, STARTING_HAND, standardDeck } from "./cards";
import {
  CARD_PORTAL_TRAP_BOARD,
  card,
  discard,
  expectRuleError,
  hasEvent,
  newGame,
  playerOf,
  roll,
  withPlayer,
} from "./testing";

const duo = () => newGame(CARD_PORTAL_TRAP_BOARD, { p1: null, p2: null });
/** Rolling a 3 from the start lands on the card tile at 4. */
const TO_CARD_TILE = 3;

describe("dealing", () => {
  it("starts everyone with four cards, one energy and an empty discard pile", () => {
    for (const { hand, deck, discard, energy } of duo().players) {
      expect(hand).toHaveLength(STARTING_HAND);
      expect(hand.length + deck.length).toBe(standardDeck({ withOpponents: true }).length);
      expect(discard).toEqual([]);
      expect(energy).toBe(1);
    }
  });

  it("builds a fixed, balanced standard deck", () => {
    expect(standardDeck({ withOpponents: false })).toHaveLength(20);
    expect(standardDeck({ withOpponents: true })).toHaveLength(26);
  });

  it("leaves opponent-targeting cards out of solo decks", () => {
    const solo = playerOf(newGame(CARD_PORTAL_TRAP_BOARD, { p1: null }), "p1");
    const dealt = [...solo.hand, ...solo.deck].map(({ cardId }) => CARD_CATALOG[cardId]);
    expect(dealt.some((definition) => definition.targetsOpponent)).toBe(false);
  });
});

describe("card tiles", () => {
  it("draw the top card of the deck", () => {
    const state = duo();
    const top = playerOf(state, "p1").deck[0];
    const { state: next, events } = roll(state, "p1", TO_CARD_TILE);
    expect(events).toContainEqual({ type: "cardDrawn", playerId: "p1", card: top });
    expect(playerOf(next, "p1").hand).toContainEqual(top);
  });

  it("pause for a discard when the hand is full, then pass the turn", () => {
    const full = [..."abcdefgh".slice(0, HAND_LIMIT)].map((uid) => card("healingHerb", uid));
    const state = withPlayer(duo(), "p1", { hand: full });
    const drawn = playerOf(state, "p1").deck[0];

    const paused = roll(state, "p1", TO_CARD_TILE).state;
    expect(paused.pendingDiscard).toMatchObject({ playerId: "p1", drawn });
    expect(paused.currentPlayerIndex).toBe(0);
    expectRuleError(() => roll(paused, "p1", 1), "DISCARD_PENDING");

    const { state: resumed, events } = discard(paused, "p1", "b");
    const after = playerOf(resumed, "p1");
    expect(after.hand.map(({ uid }) => uid)).toEqual(["a", ..."cdefgh".slice(0, HAND_LIMIT - 2).split(""), drawn.uid]);
    expect(after.hand).toHaveLength(HAND_LIMIT);
    expect(after.discard.map(({ uid }) => uid)).toEqual(["b"]);
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p2" });
  });

  it("shuffle the discard pile back in when the deck runs out", () => {
    const used = [card("windStep", "u1"), card("luckyCharm", "u2")];
    const state = withPlayer(duo(), "p1", { hand: [], deck: [], discard: used });
    const { state: next, events } = roll(state, "p1", TO_CARD_TILE);

    expect(events).toContainEqual({ type: "deckReshuffled", playerId: "p1", size: 2 });
    const after = playerOf(next, "p1");
    expect(after.discard).toEqual([]);
    expect([...after.hand, ...after.deck].map(({ uid }) => uid).sort()).toEqual(["u1", "u2"]);
  });

  it("draw nothing when both deck and discard pile are empty", () => {
    const state = withPlayer(duo(), "p1", { hand: [], deck: [], discard: [] });
    expect(hasEvent(roll(state, "p1", TO_CARD_TILE).events, "cardDrawn")).toBe(false);
  });
});
