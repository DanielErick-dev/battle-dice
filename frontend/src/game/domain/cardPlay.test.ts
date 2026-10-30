import { describe, expect, it } from "vitest";
import { cardBlocker } from "./cardPlay";
import { HAND_LIMIT, HEALING_HERB_ENERGY, cardCost, type CardId } from "./cards";
import {
  CARD_PORTAL_TRAP_BOARD,
  card,
  discard,
  expectRuleError,
  newGame,
  play,
  playerOf,
  roll,
  withPlayer,
} from "./testing";
import type { GameState } from "./types";

const duo = () => newGame(CARD_PORTAL_TRAP_BOARD, { p1: null, p2: null });
const aria = (state: GameState) => playerOf(state, "p1");
/** Aria holding just `cardId` (uid `test:${cardId}`), with `energy` to spend. */
const holding = (cardId: CardId, energy = 3) => withPlayer(duo(), "p1", { hand: [card(cardId)], energy });
const playHeld = (state: GameState, cardId: CardId, options: Parameters<typeof play>[3] = {}) =>
  play(state, "p1", `test:${cardId}`, options);

describe("playing a card", () => {
  it("costs energy by rarity and allows one card per turn", () => {
    expectRuleError(() => playHeld(holding("mysticGate", 2), "mysticGate"), "NOT_ENOUGH_ENERGY");

    const state = withPlayer(duo(), "p1", { hand: [card("arcaneShield", "x"), card("berserkFury", "y")], energy: 5 });
    const after = play(state, "p1", "x").state;
    expect(aria(after).energy).toBe(3);
    expectRuleError(() => play(after, "p1", "y"), "CARD_ALREADY_PLAYED");
  });

  it("Celestial Light costs no energy", () => {
    expect(cardCost("celestialLight")).toBe(0);
  });

  it("puts played cards on the discard pile", () => {
    const after = playHeld(holding("arcaneShield"), "arcaneShield").state;
    expect(aria(after).discard).toEqual([card("arcaneShield")]);
  });

  it("a throw card can't stack on another throw still waiting", () => {
    const thrown = withPlayer(holding("oracleEye"), "p1", { diceBoost: { kind: "double" } });
    expectRuleError(() => playHeld(thrown, "oracleEye"), "DICE_BOOST_ACTIVE");
  });

  it("a card aimed at a protected opponent is played and spent, but turned away", () => {
    for (const ward of [{ untamed: 2 }, { spectralArmour: 2 }, { divineAegis: 2 }]) {
      const state = withPlayer(holding("arcaneBlast"), "p2", { position: 9, ...ward });
      const { state: next, events } = playHeld(state, "arcaneBlast", { targetId: "p2" });
      expect(playerOf(next, "p2").position).toBe(9);
      expect(aria(next).hand.some((held) => held.uid === "test:arcaneBlast")).toBe(false);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardBlocked", targetId: "p2" }));
    }
  });
});

describe("movement cards", () => {
  it("Wind Step walks three tiles and resolves the tile it lands on", () => {
    const { state, events } = playHeld(withPlayer(holding("windStep"), "p1", { position: 7 }), "windStep");
    expect(events).toContainEqual({ type: "playerMoved", playerId: "p1", path: [8, 9, 10] });
    expect(events).toContainEqual({ type: "portalEntered", playerId: "p1", from: 10, to: 20 });
    expect(aria(state).position).toBe(20);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("Mystic Gate jumps to the next portal and goes through it", () => {
    const { state, events } = playHeld(holding("mysticGate"), "mysticGate");
    expect(events).toContainEqual({ type: "cardTeleported", playerId: "p1", from: 1, to: 10 });
    expect(aria(state).position).toBe(20);

    const pastPortals = withPlayer(holding("mysticGate"), "p1", { position: 15 });
    expectRuleError(() => playHeld(pastPortals, "mysticGate"), "NO_PORTAL_AHEAD");
    expect(cardBlocker(pastPortals, aria(pastPortals), "mysticGate")).toBe("NO_PORTAL_AHEAD");
  });

  it("Mystic Gate passes a portal under black fire or ice by: it's no portal while covered", () => {
    const burning = { ...holding("mysticGate"), blackFlames: [{ tile: 10, owner: "p2", turnsLeft: 3, hits: 0 }] };
    expect(cardBlocker(burning, aria(burning), "mysticGate")).toBe("NO_PORTAL_AHEAD");
    const frozen = { ...holding("mysticGate"), winter: { owner: "p2", frontier: 1, iced: [10] } };
    expect(cardBlocker(frozen, aria(frozen), "mysticGate")).toBe("NO_PORTAL_AHEAD");
  });
});

describe("dice cards", () => {
  it("Lucky Charm adds 2 to the next roll only", () => {
    const { state, events } = roll(playHeld(holding("luckyCharm"), "luckyCharm").state, "p1", 3);
    expect(events[0]).toEqual({ type: "diceRolled", playerId: "p1", value: 5, dice: [3], bonus: 2 });
    expect(aria(state)).toMatchObject({ position: 6, diceBonuses: [] });
  });

  it("Oracle Eye throws two dice and keeps the higher one", () => {
    const { state, events } = roll(playHeld(holding("oracleEye"), "oracleEye").state, "p1", 2, 5);
    expect(events[0]).toEqual({ type: "diceRolled", playerId: "p1", value: 5, dice: [2, 5], best: true });
    expect(aria(state).position).toBe(6);
  });

  it("Ancestral Awakening adds 3 to the next two rolls", () => {
    const awakened = playHeld(holding("ancestralAwakening"), "ancestralAwakening").state;
    const first = roll(awakened, "p1", 1);
    expect(first.events[0]).toMatchObject({ value: 4, bonus: 3 });
    expect(aria(first.state).diceBonuses).toEqual([{ amount: 3, rolls: 1 }]);

    const second = roll(roll(first.state, "p2", 1).state, "p1", 1);
    expect(second.events[0]).toMatchObject({ value: 4, bonus: 3 });
    expect(aria(second.state).diceBonuses).toEqual([]);
  });

  it("Berserk Fury rolls two dice and adds them", () => {
    const { state, events } = roll(playHeld(holding("berserkFury"), "berserkFury").state, "p1", 2, 3);
    expect(events[0]).toEqual({ type: "diceRolled", playerId: "p1", value: 5, dice: [2, 3] });
    expect(aria(state).position).toBe(6);
  });

  it("Fate Rune fixes the next roll", () => {
    expectRuleError(() => playHeld(holding("fateRune"), "fateRune", { value: 7 }), "INVALID_VALUE");
    const wished = playHeld(holding("fateRune"), "fateRune", { value: 6 }).state;
    expect(roll(wished, "p1", 1).events[0]).toMatchObject({ value: 6, dice: [6] });
  });

  it("Lucky Charm combos with Ancestral Awakening still waiting: the bonuses add up", () => {
    const awakened = playHeld(holding("ancestralAwakening"), "ancestralAwakening").state;
    const nextTurn = roll(roll(awakened, "p1", 1).state, "p2", 1).state;
    const charmed = play(
      withPlayer(nextTurn, "p1", { hand: [card("luckyCharm")], energy: 5 }),
      "p1",
      "test:luckyCharm",
    );
    const { state, events } = roll(charmed.state, "p1", 1);
    expect(events[0]).toMatchObject({ value: 6, bonus: 5 });
    expect(aria(state).diceBonuses).toEqual([]);
  });

  it("stacked bonuses each count down their own rolls", () => {
    const stacked = withPlayer(holding("luckyCharm"), "p1", { diceBonuses: [{ amount: 3, rolls: 2 }] });
    const { state, events } = roll(playHeld(stacked, "luckyCharm").state, "p1", 1);
    expect(events[0]).toMatchObject({ value: 6, bonus: 5 });
    expect(aria(state).diceBonuses).toEqual([{ amount: 3, rolls: 1 }]);
  });

  it("Berserk Fury combos with Ancestral Awakening's bonus still waiting", () => {
    const awakened = withPlayer(holding("berserkFury"), "p1", { diceBonuses: [{ amount: 3, rolls: 1 }], energy: 5 });
    const { state, events } = roll(playHeld(awakened, "berserkFury").state, "p1", 2, 4);
    expect(events[0]).toMatchObject({ value: 9, dice: [2, 4], bonus: 3 });
    expect(aria(state)).toMatchObject({ diceBoost: null, diceBonuses: [] });
  });
});

describe("support cards", () => {
  it("Healing Herb restores energy and heals a lost turn", () => {
    const state = withPlayer(holding("healingHerb", 1), "p1", { skipTurns: 1 });
    const healed = aria(playHeld(state, "healingHerb").state);
    expect(healed.energy).toBe(1 - cardCost("healingHerb") + HEALING_HERB_ENERGY);
    expect(healed.skipTurns).toBe(0);
  });

  it("Arcane Shield blocks the next trap", () => {
    const shielded = playHeld(withPlayer(holding("arcaneShield"), "p1", { position: 10 }), "arcaneShield").state;
    const { state, events } = roll(withPlayer(shielded, "p1", { position: 11 }), "p1", 1);
    expect(events).toContainEqual({ type: "trapBlocked", playerId: "p1", tile: 12, ward: "shield", hidden: false });
    expect(aria(state)).toMatchObject({ position: 12, shielded: false });
  });

  it("Arcane Shield can't be raised again while it is up", () => {
    const shielded = withPlayer(holding("arcaneShield"), "p1", { shielded: true });
    expectRuleError(() => playHeld(shielded, "arcaneShield"), "ALREADY_SHIELDED");
  });

  it("Ancient Scroll draws two cards", () => {
    const state = holding("ancientScroll");
    const [first, second] = aria(state).deck;
    expect(aria(playHeld(state, "ancientScroll").state).hand).toEqual([first, second]);
  });

  it("Ancient Scroll asks for a discard when the second card doesn't fit, without ending the turn", () => {
    const fillers = [..."abcdefg".slice(0, HAND_LIMIT - 1)].map((uid) => card("windStep", uid));
    const state = withPlayer(duo(), "p1", { hand: [card("ancientScroll"), ...fillers], energy: 2 });
    const paused = playHeld(state, "ancientScroll").state;
    expect(aria(paused).hand).toHaveLength(HAND_LIMIT);
    expect(paused.pendingDiscard).toMatchObject({ playerId: "p1", endsTurn: false });

    const resumed = discard(paused, "p1", "a").state;
    expect(resumed.currentPlayerIndex).toBe(0);
    expect(resumed.pendingDiscard).toBeNull();
  });
});

describe("cards aimed at an opponent", () => {
  it("Arcane Blast pushes an opponent back seven tiles", () => {
    const state = withPlayer(holding("arcaneBlast"), "p2", { position: 9 });
    expectRuleError(() => playHeld(state, "arcaneBlast", { targetId: "p1" }), "INVALID_TARGET");

    const { state: next, events } = playHeld(state, "arcaneBlast", { targetId: "p2" });
    expect(events).toContainEqual({ type: "playerPushed", playerId: "p2", by: "p1", path: [8, 7, 6, 5, 4, 3, 2] });
    expect(playerOf(next, "p2").position).toBe(2);
  });

  it("Fate Swap trades places with an opponent", () => {
    expectRuleError(() => playHeld(holding("fateSwap", 9), "fateSwap", { targetId: "p2" }), "NOT_ENOUGH_ENERGY");
    const state = withPlayer(withPlayer(holding("fateSwap", 10), "p1", { position: 4 }), "p2", { position: 17 });
    const next = playHeld(state, "fateSwap", { targetId: "p2" }).state;
    expect(aria(next).position).toBe(17);
    expect(playerOf(next, "p2").position).toBe(4);
    expect(aria(next).energy).toBe(0);
  });

  it("Blinding Flash costs an opponent their next turn", () => {
    const flared = playHeld(holding("blindingFlash"), "blindingFlash", { targetId: "p2" }).state;
    expect(roll(flared, "p1", 1).events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p2" },
      { type: "turnChanged", playerId: "p1" },
    ]);
  });
});
