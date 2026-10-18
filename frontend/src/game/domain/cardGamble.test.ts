import { describe, expect, it } from "vitest";
import {
  ABILITY_CYCLE,
  CARD_GAMBLE_DRAWS,
  CARD_GAMBLE_EPICS,
  CARD_GAMBLE_JACKPOT,
  CARD_GAMBLE_LOSES_UP_TO,
  CARD_GAMBLE_STOLEN,
  abilityCycle,
} from "./abilities";
import { CARD_CATALOG, HAND_LIMIT } from "./cards";
import {
  TRAP_AND_CURSE_BOARD,
  activate,
  cards,
  copies,
  discard,
  expectRuleError,
  newGame,
  playerOf,
  readyAbility,
  send,
  withPlayer,
  withPlayers,
} from "./testing";
import type { CardInstance, GameState } from "./types";

const aria = (state: GameState) => playerOf(state, "p1");
const gamble = (state: GameState, die: number) => activate(state, "p1", {}, [die]);
const handSizes = (state: GameState) => state.players.map((player) => player.hand.length);
/** Plain cards owned by `owner`, told apart by their uid prefix. */
const theirs = (owner: string, count: number) => copies("windStep", count, `${owner}:`);
const alone = () =>
  withPlayer(readyAbility(newGame(TRAP_AND_CURSE_BOARD, { p1: "cardGamble" }), "p1"), "p1", {
    hand: cards("windStep", "healingHerb", "luckyCharm"),
  });
/** The gambler and two opponents, holding `hands` in seat order. */
const table = (hands: CardInstance[][]) =>
  withPlayers(newGame(TRAP_AND_CURSE_BOARD, { p1: "cardGamble", p2: null, p3: null }), {
    p1: { hand: hands[0], abilityCharge: ABILITY_CYCLE },
    p2: { hand: hands[1], abilityCharge: 0 },
    p3: { hand: hands[2], abilityCharge: 0 },
  });

describe("Card Gamble", () => {
  it("charges over the short cycle", () => {
    expect(abilityCycle("cardGamble")).toBe(ABILITY_CYCLE);
  });

  describe("alone", () => {
    it("a low roll throws a random card away", () => {
      const { state, events } = gamble(alone(), CARD_GAMBLE_LOSES_UP_TO);
      expect(events).toContainEqual({ type: "gambleRolled", playerId: "p1", value: 2, won: false });
      expect(aria(state).hand).toHaveLength(2);
      expect(aria(state).discard).toHaveLength(1);
    });

    it("a high roll draws two cards", () => {
      const { state, events } = gamble(alone(), CARD_GAMBLE_LOSES_UP_TO + 1);
      expect(events).toContainEqual({ type: "gambleRolled", playerId: "p1", value: 3, won: true });
      expect(aria(state).hand).toHaveLength(3 + CARD_GAMBLE_DRAWS);
    });

    it("the jackpot conjures epic cards", () => {
      const conjured = aria(gamble(alone(), CARD_GAMBLE_JACKPOT).state).hand.slice(3);
      expect(conjured).toHaveLength(CARD_GAMBLE_EPICS);
      expect(conjured.every((card) => CARD_CATALOG[card.cardId].rarity === "epic")).toBe(true);
    });

    it("the jackpot never conjures a card aimed at an opponent", () => {
      for (let seed = 0; seed < 20; seed++) {
        const { state } = send(alone(), { type: "activateAbility", playerId: "p1" }, [CARD_GAMBLE_JACKPOT], seed);
        expect(aria(state).hand.every((card) => !CARD_CATALOG[card.cardId].targetsOpponent)).toBe(true);
      }
    });
  });

  describe("against opponents", () => {
    it("with opponents in the match but none in reach, a win brings nothing", () => {
      const start = table([theirs("p1", 2), theirs("p2", 3), theirs("p3", 3)]);
      const guarded = withPlayers(start, { p2: { spectralArmour: 2 }, p3: { spectralArmour: 2 } });
      expect(handSizes(gamble(guarded, CARD_GAMBLE_JACKPOT).state)).toEqual([2, 3, 3]);
    });

    it("a high roll steals two random cards from an opponent who has any", () => {
      const { state, events } = gamble(table([theirs("p1", 1), theirs("p2", 4), []]), CARD_GAMBLE_JACKPOT - 1);
      expect(handSizes(state)).toEqual([1 + CARD_GAMBLE_STOLEN, 2, 0]);
      const stolen = events.find((event) => event.type === "cardsStolen");
      expect(stolen).toMatchObject({ playerId: "p1", from: "p2", discarded: [] });
      expect(aria(state).hand).toEqual(
        expect.arrayContaining([...(stolen?.type === "cardsStolen" ? stolen.cards : [])]),
      );
    });

    it("bets against the opponent picked: a win steals from them, a loss hands them a card", () => {
      const won = activate(table([theirs("p1", 1), theirs("p2", 4), theirs("p3", 3)]), "p1", { targetId: "p3" }, [
        CARD_GAMBLE_JACKPOT - 1,
      ]);
      expect(handSizes(won.state)).toEqual([1 + CARD_GAMBLE_STOLEN, 4, 1]);
      const lost = activate(table([theirs("p1", 2), theirs("p2", 4), theirs("p3", 3)]), "p1", { targetId: "p3" }, [1]);
      expect(handSizes(lost.state)).toEqual([1, 4, 4]);
    });

    it("refuses a bet against someone who isn't an opponent", () => {
      const start = table([theirs("p1", 1), theirs("p2", 4), []]);
      expectRuleError(() => activate(start, "p1", { targetId: "p1" }, [5]), "INVALID_TARGET");
    });

    it("a low roll hands one random card to an opponent", () => {
      const { state, events } = gamble(table([theirs("p1", 3), [], []]), 1);
      expect(aria(state).hand).toHaveLength(2);
      expect(playerOf(state, "p2").hand.length + playerOf(state, "p3").hand.length).toBe(1);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardsStolen", from: "p1" }));
    });

    it("the jackpot steals epics first, from an opponent holding some", () => {
      const epic = { uid: "p3:epic", cardId: "mysticGate" as const };
      const { state, events } = gamble(table([[], theirs("p2", 3), [...theirs("p3", 2), epic]]), CARD_GAMBLE_JACKPOT);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardsStolen", from: "p3" }));
      expect(aria(state).hand).toHaveLength(CARD_GAMBLE_STOLEN);
      expect(aria(state).hand).toContainEqual(epic);
    });

    it("the jackpot tops up with random cards when there aren't enough epics", () => {
      const { state } = gamble(table([[], theirs("p2", 3), []]), CARD_GAMBLE_JACKPOT);
      expect(handSizes(state)).toEqual([CARD_GAMBLE_STOLEN, 1, 0]);
    });

    it("never throws a won card away: what doesn't fit a full hand waits for the player's discards", () => {
      const { state } = gamble(table([theirs("p1", HAND_LIMIT), theirs("p2", 3), []]), 5);
      expect(aria(state).hand).toHaveLength(HAND_LIMIT);
      expect(state.pendingDiscard).toMatchObject({ playerId: "p1", queued: [{ playerId: "p1" }] });

      // One discard per won card.
      const discardFirst = (from: GameState) => discard(from, "p1", aria(from).hand[0].uid).state;
      const once = discardFirst(state);
      expect(once.pendingDiscard).toMatchObject({ playerId: "p1", queued: [] });
      const twice = discardFirst(once);
      expect(twice.pendingDiscard).toBeNull();
      expect(aria(twice).hand).toHaveLength(HAND_LIMIT);
      expect(aria(twice).hand.filter((card) => card.uid.startsWith("p2:"))).toHaveLength(2);
    });
  });
});
