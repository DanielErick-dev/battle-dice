import { describe, expect, it } from "vitest";
import type { CardId } from "./catalog";
import { FUSED_WIND_STEP_TILES } from "./fusion";
import { CARD_PORTAL_TRAP_BOARD } from "../testing/boards";
import { card, expectRuleError, newGame, play, playerOf, send, withPlayer } from "../testing";
import type { GameState } from "../core/state";

const duo = () => newGame(CARD_PORTAL_TRAP_BOARD, { p1: null, p2: null });
const aria = (state: GameState) => playerOf(state, "p1");
/** Three plain copies, uids `a`, `b` and `c`; the fused card takes uid `a:fused`. */
const triple = (cardId: CardId) => [card(cardId, "a"), card(cardId, "b"), card(cardId, "c")];
const fuse = (state: GameState, cardId: CardId) => send(state, { type: "fuseCards", playerId: "p1", cardId });

describe("card fusion", () => {
  it("turns three plain copies into one fused card, free and without using the turn's card", () => {
    const start = withPlayer(duo(), "p1", { hand: [...triple("windStep"), card("healingHerb")], energy: 3 });
    const { state } = fuse(start, "windStep");
    expect(aria(state).hand).toEqual([card("healingHerb"), { uid: "a:fused", cardId: "windStep", fused: true }]);
    expect(aria(state).energy).toBe(3);
    expect(state.cardsPlayedThisTurn).toBe(0);
  });

  it("needs three plain copies of a card that fuses", () => {
    expectRuleError(
      () => fuse(withPlayer(duo(), "p1", { hand: triple("windStep").slice(0, 2) }), "windStep"),
      "CANNOT_FUSE",
    );
    expectRuleError(() => fuse(withPlayer(duo(), "p1", { hand: triple("fateRune") }), "fateRune"), "CANNOT_FUSE");
  });

  it("heaven's relics fuse too: the Apotheosis readies the ability and grants another turn", () => {
    const hero = newGame(CARD_PORTAL_TRAP_BOARD, { p1: "studySession", p2: null });
    const start = withPlayer(hero, "p1", { hand: triple("ascension"), energy: 5, abilityCharge: 0 });
    const { state } = play(fuse(start, "ascension").state, "p1", "a:fused");
    expect(aria(state).abilityCharge).toBeGreaterThan(0);
    expect(state.bonusTurn).toBe(true);
  });

  it("a fused Wind Step carries the player much further", () => {
    const start = withPlayer(duo(), "p1", { position: 13, hand: triple("windStep"), energy: 3 });
    const { state } = play(fuse(start, "windStep").state, "p1", "a:fused");
    expect(aria(state).position).toBe(13 + FUSED_WIND_STEP_TILES);
  });
});
