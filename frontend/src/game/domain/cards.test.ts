import { describe, expect, it } from "vitest";
import type { BoardDefinition } from "./board";
import { CARD_CATALOG, HAND_LIMIT, MAX_KI, type CardId } from "./cards";
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
  { id: "p1", name: "Goku" },
  { id: "p2", name: "Vegeta" },
];

const game = (players = DUO) => createGame(BOARD, players, { random: seededRandom(7) });

const card = (cardId: CardId, uid = `test:${cardId}`): CardInstance => ({ uid, cardId });

function withPlayer(state: GameState, id: string, patch: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...patch } : player)) };
}

function send(state: GameState, command: GameCommand, dice: number[] = [1]) {
  return applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
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
  it("starts everyone with one card and one ki", () => {
    for (const { hand, ki } of game().players) {
      expect(hand).toHaveLength(1);
      expect(ki).toBe(1);
    }
  });

  it("leaves opponent-targeting cards out of solo decks", () => {
    const solo = game([DUO[0]]).players[0];
    const cards = [...solo.hand, ...solo.deck].map(({ cardId }) => CARD_CATALOG[cardId]);
    expect(cards.some((definition) => definition.targetsOpponent)).toBe(false);
  });
});

describe("ki", () => {
  it("grows by one at the start of each turn, up to the maximum", () => {
    let state = withPlayer(game(), "p2", { ki: MAX_KI });
    state = roll(state, "p1", 1).state;
    expect(player(state, "p2").ki).toBe(MAX_KI);

    state = roll(state, "p2", 1).state;
    expect(player(state, "p1").ki).toBe(2);
  });
});

describe("card tiles", () => {
  it("draw the top card of the deck", () => {
    const state = game();
    const top = player(state, "p1").deck[0];
    const { state: next, events } = roll(state, "p1", 3);

    expect(events).toContainEqual({ type: "cardDrawn", playerId: "p1", card: top });
    expect(player(next, "p1").hand).toContainEqual(top);
  });

  it("pause for a discard when the hand is full, then pass the turn", () => {
    const full = [card("senzuBean", "a"), card("kaioken", "b"), card("kiBarrier", "c")];
    const state = withPlayer(game(), "p1", { hand: full });
    const drawn = player(state, "p1").deck[0];

    const paused = roll(state, "p1", 3).state;
    expect(paused.pendingDiscard).toMatchObject({ playerId: "p1", drawn });
    expect(paused.currentPlayerIndex).toBe(0);
    expectRuleError(() => roll(paused, "p1", 1), "DISCARD_PENDING");

    const { state: resumed, events } = send(paused, { type: "discardCard", playerId: "p1", cardUid: "b" });
    expect(player(resumed, "p1").hand.map(({ uid }) => uid)).toEqual(["a", "c", drawn.uid]);
    expect(player(resumed, "p1").hand).toHaveLength(HAND_LIMIT);
    expect(events.at(-1)).toEqual({ type: "turnChanged", playerId: "p2" });
  });
});

describe("playing cards", () => {
  const holding = (cardId: CardId, ki = 3, state = game()) => withPlayer(state, "p1", { hand: [card(cardId)], ki });

  it("costs ki by rarity and allows one card per turn", () => {
    expectRuleError(() => play(holding("instantTransmission", 2), "p1", "test:instantTransmission"), "NOT_ENOUGH_KI");

    const state = withPlayer(game(), "p1", { hand: [card("kiBarrier", "x"), card("kaioken", "y")], ki: 5 });
    const after = play(state, "p1", "x").state;
    expect(player(after, "p1").ki).toBe(4);
    expectRuleError(() => play(after, "p1", "y"), "CARD_ALREADY_PLAYED");
  });

  it("Flying Nimbus walks three tiles and resolves the tile it lands on", () => {
    const { state, events } = play(withPlayer(holding("flyingNimbus"), "p1", { position: 7 }), "p1", "test:flyingNimbus");
    expect(events).toContainEqual({ type: "playerMoved", playerId: "p1", path: [8, 9, 10] });
    expect(events).toContainEqual({ type: "portalEntered", playerId: "p1", from: 10, to: 20 });
    expect(player(state, "p1").position).toBe(20);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("Senzu Bean restores ki and heals a lost turn", () => {
    const state = withPlayer(holding("senzuBean", 1), "p1", { skipTurns: 1 });
    const healed = player(play(state, "p1", "test:senzuBean").state, "p1");
    expect(healed.ki).toBe(2);
    expect(healed.skipTurns).toBe(0);
  });

  it("Ki Barrier blocks the next trap", () => {
    const shielded = play(withPlayer(holding("kiBarrier"), "p1", { position: 10 }), "p1", "test:kiBarrier").state;
    const withoutPortal = withPlayer(shielded, "p1", { position: 11 });
    const { state, events } = roll(withoutPortal, "p1", 1);

    expect(events).toContainEqual({ type: "trapBlocked", playerId: "p1", tile: 12 });
    expect(player(state, "p1")).toMatchObject({ position: 12, shielded: false });
  });

  it("Kaioken rolls two dice and adds them", () => {
    const boosted = play(holding("kaioken"), "p1", "test:kaioken").state;
    const { state, events } = roll(boosted, "p1", 2, 3);
    expect(events[0]).toEqual({ type: "diceRolled", playerId: "p1", value: 5, dice: [2, 3] });
    expect(player(state, "p1").position).toBe(6);
  });

  it("Dragon Ball fixes the next roll", () => {
    expectRuleError(() => play(holding("dragonBall"), "p1", "test:dragonBall", { value: 7 }), "INVALID_VALUE");

    const wished = play(holding("dragonBall"), "p1", "test:dragonBall", { value: 6 }).state;
    expect(roll(wished, "p1", 1).events[0]).toMatchObject({ value: 6, dice: [6] });
  });

  it("Instant Transmission jumps to the next portal and goes through it", () => {
    const { state, events } = play(holding("instantTransmission"), "p1", "test:instantTransmission");
    expect(events).toContainEqual({ type: "cardTeleported", playerId: "p1", from: 1, to: 10 });
    expect(player(state, "p1").position).toBe(20);

    const pastPortals = withPlayer(holding("instantTransmission"), "p1", { position: 15 });
    expectRuleError(() => play(pastPortals, "p1", "test:instantTransmission"), "NO_PORTAL_AHEAD");
  });

  it("Kamehameha pushes an opponent back three tiles", () => {
    const state = withPlayer(holding("kamehameha"), "p2", { position: 9 });
    expectRuleError(() => play(state, "p1", "test:kamehameha", { targetId: "p1" }), "INVALID_TARGET");

    const { state: next, events } = play(state, "p1", "test:kamehameha", { targetId: "p2" });
    expect(events).toContainEqual({ type: "playerPushed", playerId: "p2", by: "p1", path: [8, 7, 6] });
    expect(player(next, "p2").position).toBe(6);
  });

  it("Solar Flare costs an opponent their next turn", () => {
    const flared = play(holding("solarFlare"), "p1", "test:solarFlare", { targetId: "p2" }).state;
    const { events } = roll(flared, "p1", 1);
    expect(events.slice(-2)).toEqual([
      { type: "turnSkipped", playerId: "p2" },
      { type: "turnChanged", playerId: "p1" },
    ]);
  });
});
