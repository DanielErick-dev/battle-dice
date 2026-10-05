import { describe, expect, it } from "vitest";
import type { BoardDefinition } from "./board";
import { cardBlocker } from "./cardPlay";
import {
  CARD_CATALOG,
  cardCost,
  HAND_LIMIT,
  HEALING_HERB_ENERGY,
  MAX_ENERGY,
  STARTING_HAND,
  standardDeck,
  type CardId,
} from "./cards";
import { GameRuleError, type GameCommand, type GameErrorCode } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { CardInstance, GameState, Player } from "./types";

const BOARD: BoardDefinition = {
  size: 30,
  effects: {
    4: { kind: "card" },
    10: { kind: "portal", to: 20 },
    12: { kind: "trap", to: 8 },
  },
};
const DUO = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

const game = (players = DUO) => createGame(BOARD, players, { random: seededRandom(7) });

const card = (cardId: CardId, uid = `test:${cardId}`): CardInstance => ({
  uid,
  cardId,
});

function withPlayer(state: GameState, id: string, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === id ? { ...player, ...patch } : player)),
  };
}

function send(state: GameState, command: GameCommand, dice: number[] = [1]) {
  return applyCommand(state, command, {
    rollDice: sequenceDice(dice),
    random: seededRandom(3),
  });
}

const roll = (state: GameState, playerId: string, ...dice: number[]) =>
  send(state, { type: "rollDice", playerId }, dice);

const play = (state: GameState, playerId: string, cardUid: string, extra: { targetId?: string; value?: number } = {}) =>
  send(state, { type: "playCard", playerId, cardUid, ...extra });

function expectRuleError(action: () => unknown, code: GameErrorCode) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(GameRuleError);
    expect((error as GameRuleError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;

describe("dealing", () => {
  it("starts everyone with four cards, one energy and an empty discard pile", () => {
    for (const { hand, deck, discard, energy } of game().players) {
      expect(hand).toHaveLength(STARTING_HAND);
      expect(hand.length + deck.length).toBe(standardDeck({ withOpponents: true }).length);
      expect(discard).toEqual([]);
      expect(energy).toBe(1);
    }
  });

  it("builds a fixed, balanced standard deck", () => {
    expect(standardDeck({ withOpponents: false })).toHaveLength(20);
    expect(standardDeck({ withOpponents: true })).toHaveLength(25);
  });

  it("leaves opponent-targeting cards out of solo decks", () => {
    const solo = game([DUO[0]]).players[0];
    const cards = [...solo.hand, ...solo.deck].map(({ cardId }) => CARD_CATALOG[cardId]);
    expect(cards.some((definition) => definition.targetsOpponent)).toBe(false);
  });
});

describe("energy", () => {
  it("grows by one every turn of the player's", () => {
    let state = game([DUO[0]]);
    state = roll(state, "p1", 1).state;
    expect(player(state, "p1")).toMatchObject({ energy: 2, energyCharge: 0 });

    state = roll(state, "p1", 1).state;
    expect(player(state, "p1")).toMatchObject({ energy: 3, energyCharge: 0 });
  });

  it("never goes past the maximum", () => {
    let state = withPlayer(game([DUO[0]]), "p1", {
      energy: MAX_ENERGY,
      energyCharge: 1,
    });
    state = roll(state, "p1", 1).state;
    expect(player(state, "p1").energy).toBe(MAX_ENERGY);
  });
});

describe("card tiles", () => {
  it("draw the top card of the deck", () => {
    const state = game();
    const top = player(state, "p1").deck[0];
    const { state: next, events } = roll(state, "p1", 3);

    expect(events).toContainEqual({
      type: "cardDrawn",
      playerId: "p1",
      card: top,
    });
    expect(player(next, "p1").hand).toContainEqual(top);
  });

  it("pause for a discard when the hand is full, then pass the turn", () => {
    const full = "abcdefgh"
      .slice(0, HAND_LIMIT)
      .split("")
      .map((uid) => card("healingHerb", uid));
    const state = withPlayer(game(), "p1", { hand: full });
    const drawn = player(state, "p1").deck[0];

    const paused = roll(state, "p1", 3).state;
    expect(paused.pendingDiscard).toMatchObject({ playerId: "p1", drawn });
    expect(paused.currentPlayerIndex).toBe(0);
    expectRuleError(() => roll(paused, "p1", 1), "DISCARD_PENDING");

    const { state: resumed, events } = send(paused, {
      type: "discardCard",
      playerId: "p1",
      cardUid: "b",
    });
    expect(player(resumed, "p1").hand.map(({ uid }) => uid)).toEqual([
      "a",
      ..."cdefgh".slice(0, HAND_LIMIT - 2).split(""),
      drawn.uid,
    ]);
    expect(player(resumed, "p1").hand).toHaveLength(HAND_LIMIT);
    expect(player(resumed, "p1").discard.map(({ uid }) => uid)).toEqual(["b"]);
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p2" });
  });

  it("shuffle the discard pile back in when the deck runs out", () => {
    const used = [card("windStep", "u1"), card("luckyCharm", "u2")];
    const state = withPlayer(game(), "p1", {
      hand: [],
      deck: [],
      discard: used,
    });
    const { state: next, events } = roll(state, "p1", 3);

    expect(events).toContainEqual({
      type: "deckReshuffled",
      playerId: "p1",
      size: 2,
    });
    const after = player(next, "p1");
    expect(after.discard).toEqual([]);
    expect([...after.hand, ...after.deck].map(({ uid }) => uid).sort()).toEqual(["u1", "u2"]);
  });

  it("draw nothing when both deck and discard pile are empty", () => {
    const state = withPlayer(game(), "p1", { hand: [], deck: [], discard: [] });
    const { events } = roll(state, "p1", 3);
    expect(events.some((event) => event.type === "cardDrawn")).toBe(false);
  });
});

describe("playing cards", () => {
  const holding = (cardId: CardId, energy = 3, state = game()) =>
    withPlayer(state, "p1", { hand: [card(cardId)], energy });

  it("costs energy by rarity and allows one card per turn", () => {
    expectRuleError(() => play(holding("mysticGate", 2), "p1", "test:mysticGate"), "NOT_ENOUGH_ENERGY");

    const state = withPlayer(game(), "p1", {
      hand: [card("arcaneShield", "x"), card("berserkFury", "y")],
      energy: 5,
    });
    const after = play(state, "p1", "x").state;
    expect(player(after, "p1").energy).toBe(3);
    expectRuleError(() => play(after, "p1", "y"), "CARD_ALREADY_PLAYED");
  });

  it("puts played cards on the discard pile", () => {
    const after = play(holding("arcaneShield"), "p1", "test:arcaneShield").state;
    expect(player(after, "p1").discard).toEqual([card("arcaneShield")]);
  });

  it("Wind Step walks three tiles and resolves the tile it lands on", () => {
    const { state, events } = play(withPlayer(holding("windStep"), "p1", { position: 7 }), "p1", "test:windStep");
    expect(events).toContainEqual({
      type: "playerMoved",
      playerId: "p1",
      path: [8, 9, 10],
    });
    expect(events).toContainEqual({
      type: "portalEntered",
      playerId: "p1",
      from: 10,
      to: 20,
    });
    expect(player(state, "p1").position).toBe(20);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("Healing Herb restores energy and heals a lost turn", () => {
    const state = withPlayer(holding("healingHerb", 1), "p1", { skipTurns: 1 });
    const healed = player(play(state, "p1", "test:healingHerb").state, "p1");
    expect(healed.energy).toBe(1 - cardCost("healingHerb") + HEALING_HERB_ENERGY);
    expect(healed.skipTurns).toBe(0);
  });

  it("Arcane Shield blocks the next trap", () => {
    const shielded = play(withPlayer(holding("arcaneShield"), "p1", { position: 10 }), "p1", "test:arcaneShield").state;
    const withoutPortal = withPlayer(shielded, "p1", { position: 11 });
    const { state, events } = roll(withoutPortal, "p1", 1);

    expect(events).toContainEqual({
      type: "trapBlocked",
      playerId: "p1",
      tile: 12,
      ward: "shield",
      hidden: false,
    });
    expect(player(state, "p1")).toMatchObject({
      position: 12,
      shielded: false,
    });
  });

  it("Arcane Shield can't be raised again while it is up", () => {
    const shielded = withPlayer(holding("arcaneShield"), "p1", {
      shielded: true,
    });
    expectRuleError(() => play(shielded, "p1", "test:arcaneShield"), "ALREADY_SHIELDED");
  });

  it("a dice card can't stack on a waiting modifier of the same kind", () => {
    const thrown = withPlayer(holding("oracleEye"), "p1", { diceBoost: { kind: "double" } });
    expectRuleError(() => play(thrown, "p1", "test:oracleEye"), "DICE_BOOST_ACTIVE");
    const bonused = withPlayer(holding("luckyCharm"), "p1", { diceBonus: { amount: 3, rolls: 2 } });
    expectRuleError(() => play(bonused, "p1", "test:luckyCharm"), "DICE_BOOST_ACTIVE");
  });

  it("Berserk Fury combos with Ancestral Awakening's bonus still waiting", () => {
    const awakened = withPlayer(holding("berserkFury"), "p1", { diceBonus: { amount: 3, rolls: 1 }, energy: 5 });
    const { state, events } = roll(play(awakened, "p1", "test:berserkFury").state, "p1", 2, 4);
    expect(events[0]).toMatchObject({ value: 9, dice: [2, 4], bonus: 3 });
    expect(player(state, "p1")).toMatchObject({ diceBoost: null, diceBonus: null });
  });

  it("Ancient Scroll draws two cards", () => {
    const state = holding("ancientScroll");
    const [first, second] = player(state, "p1").deck;
    const { state: next } = play(state, "p1", "test:ancientScroll");
    expect(player(next, "p1").hand).toEqual([first, second]);
  });

  it("Ancient Scroll asks for a discard when the second card doesn't fit, without ending the turn", () => {
    const hand = [
      card("ancientScroll"),
      ..."abcdefg"
        .slice(0, HAND_LIMIT - 1)
        .split("")
        .map((uid) => card("windStep", uid)),
    ];
    const state = withPlayer(game(), "p1", { hand, energy: 2 });
    const paused = play(state, "p1", "test:ancientScroll").state;
    expect(player(paused, "p1").hand).toHaveLength(HAND_LIMIT);
    expect(paused.pendingDiscard).toMatchObject({
      playerId: "p1",
      endsTurn: false,
    });

    const resumed = send(paused, {
      type: "discardCard",
      playerId: "p1",
      cardUid: "a",
    }).state;
    expect(resumed.currentPlayerIndex).toBe(0);
    expect(resumed.pendingDiscard).toBeNull();
  });

  it("Lucky Charm adds 2 to the next roll only", () => {
    const charmed = play(holding("luckyCharm"), "p1", "test:luckyCharm").state;
    const { state, events } = roll(charmed, "p1", 3);
    expect(events[0]).toEqual({
      type: "diceRolled",
      playerId: "p1",
      value: 5,
      dice: [3],
      bonus: 2,
    });
    expect(player(state, "p1")).toMatchObject({ position: 6, diceBonus: null });
  });

  it("Oracle Eye throws two dice and keeps the higher one", () => {
    const foreseen = play(holding("oracleEye"), "p1", "test:oracleEye").state;
    const { state, events } = roll(foreseen, "p1", 2, 5);
    expect(events[0]).toEqual({
      type: "diceRolled",
      playerId: "p1",
      value: 5,
      dice: [2, 5],
      best: true,
    });
    expect(player(state, "p1").position).toBe(6);
  });

  it("Ancestral Awakening adds 3 to the next two rolls", () => {
    const awakened = play(holding("ancestralAwakening"), "p1", "test:ancestralAwakening").state;
    const first = roll(awakened, "p1", 1);
    expect(first.events[0]).toMatchObject({ value: 4, bonus: 3 });
    expect(player(first.state, "p1").diceBonus).toEqual({ amount: 3, rolls: 1 });

    const second = roll(roll(first.state, "p2", 1).state, "p1", 1);
    expect(second.events[0]).toMatchObject({ value: 4, bonus: 3 });
    expect(player(second.state, "p1").diceBonus).toBeNull();
  });

  it("Berserk Fury rolls two dice and adds them", () => {
    const boosted = play(holding("berserkFury"), "p1", "test:berserkFury").state;
    const { state, events } = roll(boosted, "p1", 2, 3);
    expect(events[0]).toEqual({
      type: "diceRolled",
      playerId: "p1",
      value: 5,
      dice: [2, 3],
    });
    expect(player(state, "p1").position).toBe(6);
  });

  it("Fate Rune fixes the next roll", () => {
    expectRuleError(() => play(holding("fateRune"), "p1", "test:fateRune", { value: 7 }), "INVALID_VALUE");

    const wished = play(holding("fateRune"), "p1", "test:fateRune", {
      value: 6,
    }).state;
    expect(roll(wished, "p1", 1).events[0]).toMatchObject({
      value: 6,
      dice: [6],
    });
  });

  it("Mystic Gate jumps to the next portal and goes through it", () => {
    const { state, events } = play(holding("mysticGate"), "p1", "test:mysticGate");
    expect(events).toContainEqual({
      type: "cardTeleported",
      playerId: "p1",
      from: 1,
      to: 10,
    });
    expect(player(state, "p1").position).toBe(20);

    const pastPortals = withPlayer(holding("mysticGate"), "p1", {
      position: 15,
    });
    expectRuleError(() => play(pastPortals, "p1", "test:mysticGate"), "NO_PORTAL_AHEAD");
    expect(cardBlocker(pastPortals.board, player(pastPortals, "p1"), "mysticGate")).toBe("NO_PORTAL_AHEAD");
  });

  it("Arcane Blast pushes an opponent back three tiles", () => {
    const state = withPlayer(holding("arcaneBlast"), "p2", { position: 9 });
    expectRuleError(() => play(state, "p1", "test:arcaneBlast", { targetId: "p1" }), "INVALID_TARGET");

    const { state: next, events } = play(state, "p1", "test:arcaneBlast", {
      targetId: "p2",
    });
    expect(events).toContainEqual({
      type: "playerPushed",
      playerId: "p2",
      by: "p1",
      path: [8, 7, 6],
    });
    expect(player(next, "p2").position).toBe(6);
  });

  it("Fate Swap trades places with an opponent", () => {
    expectRuleError(() => play(holding("fateSwap", 9), "p1", "test:fateSwap", { targetId: "p2" }), "NOT_ENOUGH_ENERGY");
    const state = withPlayer(withPlayer(holding("fateSwap", 10), "p1", { position: 4 }), "p2", { position: 17 });
    const next = play(state, "p1", "test:fateSwap", { targetId: "p2" }).state;
    expect(player(next, "p1").position).toBe(17);
    expect(player(next, "p2").position).toBe(4);
    expect(player(next, "p1").energy).toBe(0);
  });

  it("Blinding Flash costs an opponent their next turn", () => {
    const flared = play(holding("blindingFlash"), "p1", "test:blindingFlash", {
      targetId: "p2",
    }).state;
    const { events } = roll(flared, "p1", 1);
    expect(events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p2" },
      { type: "turnChanged", playerId: "p1" },
    ]);
  });
});

describe("cursed traps", () => {
  const cursed = (curse: "discard" | "drain", patch: Partial<Player>) =>
    withPlayer(
      {
        ...game(),
        board: {
          ...game().board,
          tiles: game().board.tiles.map((tile) =>
            tile.id === 12 ? { ...tile, effect: { kind: "trap" as const, to: 8, curse } } : tile,
          ),
        },
      },
      "p1",
      { position: 11, ...patch },
    );

  it("throw away a random card from the hand", () => {
    const hand = [card("windStep", "a"), card("luckyCharm", "b")];
    const { state, events } = roll(cursed("discard", { hand }), "p1", 1);

    const cursedEvent = events.find((event) => event.type === "trapCursed");
    expect(cursedEvent).toMatchObject({ curse: "discard", energyLost: 0 });
    const lost = cursedEvent?.type === "trapCursed" ? cursedEvent.card : null;
    expect(hand).toContainEqual(lost);
    expect(player(state, "p1").hand).toHaveLength(1);
    expect(player(state, "p1").discard).toEqual([lost]);
    expect(player(state, "p1").position).toBe(8);
  });

  it("take nothing from an empty hand", () => {
    const { events } = roll(cursed("discard", { hand: [] }), "p1", 1);
    expect(events).toContainEqual({
      type: "trapCursed",
      playerId: "p1",
      curse: "discard",
      card: null,
      energyLost: 0,
    });
  });

  it("drain up to 2 energy", () => {
    const drained = roll(cursed("drain", { energy: 3 }), "p1", 1).state;
    expect(player(drained, "p1").energy).toBe(1);

    const { state, events } = roll(cursed("drain", { energy: 1 }), "p1", 1);
    expect(player(state, "p1").energy).toBe(0);
    expect(events).toContainEqual({
      type: "trapCursed",
      playerId: "p1",
      curse: "drain",
      card: null,
      energyLost: 1,
    });
  });

  it("are stopped entirely by the Arcane Shield", () => {
    const { state, events } = roll(cursed("drain", { energy: 3, shielded: true }), "p1", 1);
    expect(events.some((event) => event.type === "trapCursed")).toBe(false);
    expect(player(state, "p1")).toMatchObject({ energy: 3, position: 12 });
  });
});
