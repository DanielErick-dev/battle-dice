import { describe, expect, it } from "vitest";
import {
  ABILITY_CYCLE,
  ARROW_RAIN_PUSH,
  CARD_GAMBLE_DRAWS,
  CARD_GAMBLE_LOSES_UP_TO,
  CARD_GAMBLE_STOLEN,
  CELESTIAL_GRACE_ENERGY,
  CRIMSON_MARCH_BONUS,
  DORMANT_FURY_MULTIPLIER,
  LEVITATION_TURNS,
  LONG_ABILITY_CYCLE,
  RESURRECTION_CARDS,
  abilityCycle,
  type AbilityId,
} from "./abilities";
import type { BoardDefinition } from "./board";
import { CARD_CATALOG, HAND_LIMIT } from "./cards";
import { transmutationPool } from "./transmutation";
import { GameRuleError, type GameCommand, type GameErrorCode } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { CardInstance, GameState, Player } from "./types";

const BOARD: BoardDefinition = {
  size: 40,
  effects: {
    12: { kind: "trap", to: 8, curse: "drain" },
    20: { kind: "curse", curse: "discard" },
  },
};

const game = (ability: AbilityId) =>
  createGame(BOARD, [{ id: "p1", name: "Aria", ability }], {
    random: seededRandom(7),
  });

function withPlayer(state: GameState, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, ...patch })),
  };
}

const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, {
    rollDice: sequenceDice(dice),
    random: seededRandom(3),
  });
const roll = (state: GameState, ...dice: number[]) => send(state, { type: "rollDice", playerId: "p1" }, dice);
const play = (state: GameState, cardUid: string) => send(state, { type: "playCard", playerId: "p1", cardUid });
const activate = (state: GameState) => send(state, { type: "activateAbility", playerId: "p1" });
const answer = (state: GameState, use: boolean) => send(state, { type: "answerWard", playerId: "p1", use });

const ready = (state: GameState) => withPlayer(state, { abilityCharge: abilityCycle(state.players[0].ability) });
const cards = (...ids: CardInstance["cardId"][]): CardInstance[] => ids.map((cardId, i) => ({ uid: `c${i}`, cardId }));

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

describe("character abilities", () => {
  it("charge over three turns, counting the first, then stay ready until used", () => {
    let state = game("crimsonMarch");
    const readyAt: number[] = [];
    for (let turn = 1; turn <= 6; turn++) {
      const { state: next, events } = roll(state, 1);
      if (events.some((event) => event.type === "abilityReady")) readyAt.push(turn + 1);
      state = next;
    }
    expect(readyAt).toEqual([3]);
    expect(state.players[0].abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("recharge from empty once used", () => {
    const used = activate(ready(game("crimsonMarch"))).state;
    expect(used.players[0].abilityCharge).toBe(0);
    expectRuleError(() => activate(used), "ABILITY_NOT_READY");
    expectRuleError(() => activate(roll(roll(used, 1).state, 1).state), "ABILITY_NOT_READY");
    const recharged = roll(roll(roll(used, 1).state, 1).state, 1).state;
    expect(recharged.players[0].abilityCharge).toBe(ABILITY_CYCLE);
  });

  it("can't be used before they are charged", () => {
    expectRuleError(() => activate(game("doubleCast")), "ABILITY_NOT_READY");
  });

  it("Double Cast lets two cards be played in the turn it's used", () => {
    const hand = cards("arcaneShield", "luckyCharm");
    const once = play(withPlayer(ready(game("doubleCast")), { hand, energy: 5 }), "c0").state;
    expectRuleError(() => play(once, "c1"), "CARD_ALREADY_PLAYED");
    expect(play(activate(once).state, "c1").state.cardsPlayedThisTurn).toBe(2);
  });

  it("Crimson March walks further on the turn it's used", () => {
    const { events, state } = roll(activate(ready(game("crimsonMarch"))).state, 3);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "diceRolled",
        value: 3 + CRIMSON_MARCH_BONUS,
      }),
    );
    expect(state.players[0].position).toBe(1 + 3 + CRIMSON_MARCH_BONUS);
  });

  describe("Dormant Fury", () => {
    it("walks three times the dice, in a flash, on the turn it's used", () => {
      for (const die of [1, 6]) {
        const { events, state } = roll(activate(ready(game("dormantFury"))).state, die);
        expect(events).toContainEqual(
          expect.objectContaining({ type: "diceRolled", value: die * DORMANT_FURY_MULTIPLIER, multiplier: 3 }),
        );
        expect(events).toContainEqual(expect.objectContaining({ type: "playerMoved", dash: true }));
        expect(state.players[0].position).toBe(1 + die * DORMANT_FURY_MULTIPLIER);
      }
    });

    it("triples card modifiers too, and only that turn", () => {
      const fated = withPlayer(activate(ready(game("dormantFury"))).state, { diceBoost: { kind: "fixed", value: 6 } });
      const { state, events } = roll(fated, 1);
      expect(events).toContainEqual(expect.objectContaining({ type: "diceRolled", value: 18 }));
      const next = roll(state, 2).events;
      expect(next).toContainEqual(expect.objectContaining({ type: "diceRolled", value: 2 }));
      expect(next).not.toContainEqual(expect.objectContaining({ type: "playerMoved", dash: true }));
    });

    it("takes the long cycle to charge", () => {
      expect(abilityCycle("dormantFury")).toBe(LONG_ABILITY_CYCLE);
    });
  });

  it("Celestial Grace gives energy right away, and waits while energy is full", () => {
    const { state, events } = activate(withPlayer(ready(game("celestialGrace")), { energy: 1 }));
    expect(events).toContainEqual({
      type: "abilityUsed",
      playerId: "p1",
      ability: "celestialGrace",
      energyGained: CELESTIAL_GRACE_ENERGY,
    });
    expect(state.players[0].energy).toBe(1 + CELESTIAL_GRACE_ENERGY);
    expectRuleError(() => activate(withPlayer(ready(game("celestialGrace")), { energy: 5 })), "ENERGY_FULL");
  });

  it("Dragon Hoard draws cards right away", () => {
    const before = withPlayer(ready(game("dragonHoard")), { hand: [] });
    const { state, events } = activate(before);
    expect(events.filter((event) => event.type === "cardDrawn")).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(2);
  });

  describe("Transmutation", () => {
    const transmute = (state: GameState, cardUid?: string) =>
      send(state, { type: "activateAbility", playerId: "p1", cardUids: cardUid === undefined ? [] : [cardUid] });
    const holding = (...ids: CardInstance["cardId"][]) =>
      withPlayer(ready(game("transmutation")), { hand: cards(...ids) });

    it("turns the chosen card into a rare or epic, in the same place", () => {
      const { state, events } = transmute(holding("windStep", "healingHerb"), "c1");
      const [kept, changed] = state.players[0].hand;
      expect(kept).toEqual({ uid: "c0", cardId: "windStep" });
      expect(["rare", "epic"]).toContain(CARD_CATALOG[changed.cardId].rarity);
      expect(changed.uid).not.toBe("c1");
      expect(events).toContainEqual({
        type: "cardTransmuted",
        playerId: "p1",
        from: { uid: "c1", cardId: "healingHerb" },
        to: changed,
      });
      expect(state.players[0].abilityCharge).toBe(0);
    });

    it("charges over the long cycle", () => {
      expect(abilityCycle("transmutation")).toBe(LONG_ABILITY_CYCLE);
    });

    it("draws from every rare and epic but the card itself", () => {
      expect(transmutationPool("windStep", false)).toEqual([
        "berserkFury",
        "oracleEye",
        "mysticGate",
        "fateRune",
        "ancestralAwakening",
      ]);
      expect(transmutationPool("mysticGate", false)).not.toContain("mysticGate");
    });

    it("never gives a card that needs an opponent when playing alone", () => {
      expect(transmutationPool("windStep", false)).not.toContain("arcaneBlast");
      expect(transmutationPool("windStep", true)).toContain("arcaneBlast");
    });

    it("needs a card from the hand", () => {
      expectRuleError(() => transmute(holding("windStep")), "UNKNOWN_CARD");
      expectRuleError(() => transmute(holding("windStep"), "nope"), "UNKNOWN_CARD");
      expectRuleError(() => transmute(holding(), "c0"), "EMPTY_HAND");
    });
  });

  describe("Levitation", () => {
    const floating = (patch: Partial<Player> = {}) =>
      activate(withPlayer(ready(game("levitation")), { position: 10, energy: 3, ...patch })).state;

    it("charges over the long cycle and floats for two turns", () => {
      expect(abilityCycle("levitation")).toBe(LONG_ABILITY_CYCLE);
      expect(floating().players[0].levitating).toBe(LEVITATION_TURNS);
    });

    it("floats over traps without being thrown back or cursed", () => {
      const { state, events } = roll(floating(), 2);
      expect(state.players[0]).toMatchObject({ position: 12, energy: 3 });
      expect(events).toContainEqual({ type: "levitatedOver", playerId: "p1", tile: 12 });
      expect(events.some((event) => event.type === "trapTriggered" || event.type === "trapCursed")).toBe(false);
    });

    it("floats over curses too, and keeps an Arcane Shield untouched", () => {
      const { state } = roll(floating({ shielded: true, hand: cards("windStep") }), 10);
      expect(state.players[0]).toMatchObject({ position: 20, shielded: true, hand: cards("windStep") });
    });

    it("floats over a hidden trap without springing or revealing it", () => {
      const start = { ...floating(), hiddenTraps: [11] };
      const { state, events } = roll(start, 1);
      expect(state.players[0].position).toBe(11);
      expect(state.hiddenTraps).toEqual([11]);
      expect(events.some((event) => event.type === "hiddenTrapSprung" || event.type === "levitatedOver")).toBe(false);
    });

    it("lands after its second turn", () => {
      const first = roll(floating(), 1).state;
      expect(first.players[0].levitating).toBe(1);
      const second = roll(first, 1).state;
      expect(second.players[0].levitating).toBe(0);
      expect(roll(withPlayer(second, { position: 11 }), 1).state.players[0].position).toBe(8);
    });
  });

  describe("Arrow Rain", () => {
    const aiming = (patch: Partial<GameState> = {}) =>
      activate({ ...withPlayer(ready(game("arrowRain")), { position: 10, energy: 3 }), ...patch });

    it("charges over the long cycle", () => {
      expect(abilityCycle("arrowRain")).toBe(LONG_ABILITY_CYCLE);
    });

    it("alone, pins down the next three threats ahead, hidden traps and curses included", () => {
      const { state, events } = aiming({ hiddenTraps: [15] });
      expect(state.pinnedTraps).toEqual([12, 15, 20]);
      expect(events).toContainEqual({
        type: "arrowsLoosed",
        playerId: "p1",
        targets: [12, 15, 20],
        pinned: [12, 15, 20],
        hidden: [15],
      });
    });

    it("leaves a pinned trap harmless to land on, then frees it", () => {
      const { state, events } = roll(aiming().state, 2);
      expect(state.players[0]).toMatchObject({ position: 12, energy: 3 });
      expect(events.some((event) => event.type === "trapTriggered" || event.type === "wardOffered")).toBe(false);
      expect(events).toContainEqual({ type: "trapUnpinned", tile: 12 });
      expect(state.pinnedTraps).toEqual([20]);
    });

    it("frees the traps walked past, which strike again from then on", () => {
      const passed = roll(aiming({ hiddenTraps: [15] }).state, 6).state;
      expect(passed.players[0].position).toBe(16);
      expect(passed.pinnedTraps).toEqual([20]);
      expect(roll(withPlayer(passed, { position: 11 }), 1).state.players[0].position).toBe(8);
    });

    it("keeps a pinned hidden trap from springing", () => {
      const { state, events } = roll(aiming({ hiddenTraps: [11] }).state, 1);
      expect(state.players[0].position).toBe(11);
      expect(events.some((event) => event.type === "hiddenTrapSprung")).toBe(false);
    });

    it("knocks every opponent back instead of pinning traps", () => {
      const start = createGame(
        BOARD,
        [
          { id: "p1", name: "Aria", ability: "arrowRain" },
          { id: "p2", name: "Bran" },
          { id: "p3", name: "Cora" },
        ],
        { random: seededRandom(7) },
      );
      const placed = {
        ...start,
        players: start.players.map((player, index) => ({
          ...player,
          position: [10, 30, 3][index],
          abilityCharge: index === 0 ? LONG_ABILITY_CYCLE : 0,
        })),
      };
      const { state, events } = activate(placed);
      expect(state.players.map((player) => player.position)).toEqual([10, 30 - ARROW_RAIN_PUSH, 1]);
      expect(state.pinnedTraps).toEqual([]);
      expect(events).toContainEqual({ type: "arrowsLoosed", playerId: "p1", targets: [30, 3], pinned: [], hidden: [] });
      expect(events.filter((event) => event.type === "playerPushed")).toHaveLength(2);
    });
  });

  describe("Card Gamble", () => {
    const gamble = (state: GameState, die: number) => send(state, { type: "activateAbility", playerId: "p1" }, [die]);
    const alone = () => withPlayer(ready(game("cardGamble")), { hand: cards("windStep", "healingHerb", "luckyCharm") });
    const table = (hands: CardInstance[][]) => {
      const start = createGame(
        BOARD,
        [
          { id: "p1", name: "Aria", ability: "cardGamble" },
          { id: "p2", name: "Bran" },
          { id: "p3", name: "Cora" },
        ],
        { random: seededRandom(7) },
      );
      return {
        ...start,
        players: start.players.map((player, index) => ({
          ...player,
          hand: hands[index],
          abilityCharge: index === 0 ? ABILITY_CYCLE : 0,
        })),
      };
    };
    const theirs = (owner: string, count: number) =>
      Array.from({ length: count }, (_, i) => ({ uid: `${owner}:${i}`, cardId: "windStep" as const }));

    it("charges over the short cycle", () => {
      expect(abilityCycle("cardGamble")).toBe(ABILITY_CYCLE);
    });

    it("alone, a low roll throws a random card away", () => {
      const { state, events } = gamble(alone(), CARD_GAMBLE_LOSES_UP_TO);
      expect(events).toContainEqual({ type: "gambleRolled", playerId: "p1", value: 2, won: false });
      expect(state.players[0].hand).toHaveLength(2);
      expect(state.players[0].discard).toHaveLength(1);
    });

    it("alone, a high roll draws two cards", () => {
      const { state, events } = gamble(alone(), CARD_GAMBLE_LOSES_UP_TO + 1);
      expect(events).toContainEqual({ type: "gambleRolled", playerId: "p1", value: 3, won: true });
      expect(state.players[0].hand).toHaveLength(3 + CARD_GAMBLE_DRAWS);
    });

    it("a high roll steals two random cards from an opponent who has any", () => {
      const { state, events } = gamble(table([theirs("p1", 1), theirs("p2", 4), []]), 6);
      expect(state.players.map((player) => player.hand.length)).toEqual([1 + CARD_GAMBLE_STOLEN, 2, 0]);
      const stolen = events.find((event) => event.type === "cardsStolen");
      expect(stolen).toMatchObject({ playerId: "p1", from: "p2", discarded: [] });
      expect(state.players[0].hand).toEqual(
        expect.arrayContaining([...(stolen?.type === "cardsStolen" ? stolen.cards : [])]),
      );
    });

    it("a low roll hands one random card to an opponent", () => {
      const { state, events } = gamble(table([theirs("p1", 3), [], []]), 1);
      expect(state.players[0].hand).toHaveLength(2);
      expect(state.players[1].hand.length + state.players[2].hand.length).toBe(1);
      expect(events).toContainEqual(expect.objectContaining({ type: "cardsStolen", from: "p1" }));
    });

    it("sends what doesn't fit a full hand to the discard pile", () => {
      const { state, events } = gamble(table([theirs("p1", 5), theirs("p2", 3), []]), 5);
      expect(state.players[0].hand).toHaveLength(6);
      expect(state.players[0].discard).toHaveLength(1);
      const stolen = events.find((event) => event.type === "cardsStolen");
      expect(stolen?.type === "cardsStolen" && stolen.discarded).toHaveLength(1);
    });
  });

  describe("Resurrection", () => {
    const resurrect = (state: GameState, ...cardUids: string[]) =>
      send(state, { type: "activateAbility", playerId: "p1", cardUids });
    const shaman = (patch: Partial<Player>) => withPlayer(ready(game("resurrection")), patch);
    const pile = cards("windStep", "healingHerb", "arcaneShield");

    it("brings the chosen discarded cards back to the hand, in the order picked", () => {
      const { state, events } = resurrect(shaman({ hand: [], discard: pile }), "c2", "c0");
      const risen = [
        { ...pile[2], risen: true },
        { ...pile[0], risen: true },
      ];
      expect(state.players[0].hand).toEqual(risen);
      expect(state.players[0].discard).toEqual([pile[1]]);
      expect(events).toContainEqual({ type: "cardsResurrected", playerId: "p1", cards: risen });
      expect(state.players[0].abilityCharge).toBe(0);
    });

    it("charges over the long cycle", () => {
      expect(abilityCycle("resurrection")).toBe(LONG_ABILITY_CYCLE);
    });

    it("takes one card or up to the limit, never more than the hand has room for", () => {
      expect(resurrect(shaman({ hand: [], discard: pile }), "c1").state.players[0].hand).toEqual([
        { ...pile[1], risen: true },
      ]);
      expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "c0", "c1", "c2"), "TOO_MANY_CARDS");
      const almostFull = cards("windStep", "windStep", "windStep", "windStep", "windStep").map((card) => ({
        ...card,
        uid: `h${card.uid}`,
      }));
      expectRuleError(() => resurrect(shaman({ hand: almostFull, discard: pile }), "c0", "c1"), "TOO_MANY_CARDS");
      expect(RESURRECTION_CARDS).toBe(2);
    });

    it("needs cards from the player's own discard pile", () => {
      expectRuleError(() => resurrect(shaman({ hand: [], discard: pile })), "UNKNOWN_CARD");
      expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "nope"), "UNKNOWN_CARD");
      expectRuleError(() => resurrect(shaman({ hand: [], discard: pile }), "c0", "c0"), "UNKNOWN_CARD");
      expectRuleError(() => resurrect(shaman({ hand: [], discard: [] }), "c0"), "EMPTY_DISCARD");
    });

    it("risen cards crumble to dust once played: they never reach the discard pile again", () => {
      const raised = resurrect(shaman({ hand: [], discard: pile, energy: 5 }), "c1").state;
      const played = send(raised, { type: "playCard", playerId: "p1", cardUid: "c1" }).state;
      expect(played.players[0].hand).toEqual([]);
      expect(played.players[0].discard.map((card) => card.uid)).toEqual(["c0", "c2"]);
    });

    it("can't be used with a full hand", () => {
      const full = Array.from({ length: HAND_LIMIT }, (_, i) => ({ uid: `h${i}`, cardId: "windStep" as const }));
      expectRuleError(() => resurrect(shaman({ hand: full, discard: pile }), "c0"), "HAND_FULL");
    });
  });

  describe("Trap Ward", () => {
    const onTheWay = (patch: Partial<Player> = {}) =>
      withPlayer(ready(game("trapWard")), {
        position: 11,
        energy: 3,
        ...patch,
      });

    it("can't be used on its own: it answers traps", () => {
      expectRuleError(() => activate(onTheWay()), "ABILITY_REACTIVE");
    });

    it("asks before a trap strikes, and holds the turn until answered", () => {
      const { state, events } = roll(onTheWay(), 1);
      expect(events).toContainEqual({
        type: "wardOffered",
        playerId: "p1",
        tile: 12,
        threat: "trap",
      });
      expect(state.pendingWard).toMatchObject({
        playerId: "p1",
        tile: 12,
        endsTurn: true,
      });
      expect(state.players[0].position).toBe(12);
      expectRuleError(() => roll(state, 1), "WARD_PENDING");
    });

    it("used, keeps the trap off and empties the charge", () => {
      const { state, events } = answer(roll(onTheWay(), 1).state, true);
      expect(events).toContainEqual({
        type: "trapBlocked",
        playerId: "p1",
        tile: 12,
        ward: "ability",
        hidden: false,
      });
      expect(state.players[0]).toMatchObject({
        position: 12,
        energy: 3,
        abilityCharge: 1,
      });
      expect(state.pendingWard).toBeNull();
    });

    it("used, smashes the trap for good: the tile never strikes again", () => {
      const { state: smashed, events } = answer(roll(onTheWay(), 1).state, true);
      expect(events).toContainEqual({ type: "trapDestroyed", playerId: "p1", tile: 12, hidden: false });
      expect(smashed.destroyedTraps).toEqual([12]);

      let state = smashed;
      for (let turn = 0; turn < 4; turn++) {
        const next = roll(withPlayer(state, { position: 11, abilityCharge: 0 }), 1);
        expect(next.state.players[0].position).toBe(12);
        expect(next.events.some((event) => event.type === "wardOffered" || event.type === "trapTriggered")).toBe(false);
        state = next.state;
      }
    });

    it("used on a hidden trap, takes it off the board for good", () => {
      const zoned = createGame(
        { size: 40, effects: {}, trapZones: [{ from: 10, to: 13, traps: 1 }] },
        [{ id: "p1", name: "Aria", ability: "trapWard" }],
        { random: seededRandom(7) },
      );
      const trap = zoned.hiddenTraps[0];
      const smashed = answer(roll(withPlayer(ready(zoned), { position: trap - 1 }), 1).state, true).state;
      expect(smashed.hiddenTraps).toEqual([]);
      expect(smashed.destroyedTraps).toEqual([trap]);
    });

    it("used on a curse, wards it off but leaves it in place", () => {
      const { state } = roll(onTheWay({ position: 19 }), 1);
      expect(answer(state, true).state.destroyedTraps).toEqual([]);
    });

    it("declined, lets the trap strike and stays charged", () => {
      const { state } = answer(roll(onTheWay(), 1).state, false);
      expect(state.players[0]).toMatchObject({ position: 8, energy: 1, abilityCharge: LONG_ABILITY_CYCLE });
    });

    it("takes five turns to charge, counting the first", () => {
      let state = game("trapWard");
      const readyAt: number[] = [];
      for (let turn = 1; turn <= 8; turn++) {
        const { state: next, events } = roll(state, 1);
        if (events.some((event) => event.type === "abilityReady")) readyAt.push(turn + 1);
        state = next;
      }
      expect(readyAt).toEqual([LONG_ABILITY_CYCLE]);
      expect(abilityCycle("trapWard")).toBe(5);
    });

    it("is offered even behind the Arcane Shield, which it then keeps", () => {
      const { state, events } = roll(onTheWay({ shielded: true }), 1);
      expect(events).toContainEqual({ type: "wardOffered", playerId: "p1", tile: 12, threat: "trap" });
      expect(answer(state, true).state.players[0]).toMatchObject({ position: 12, shielded: true, abilityCharge: 1 });
    });

    it("declined behind the Arcane Shield, lets the shield take the trap and stays charged", () => {
      const { state } = answer(roll(onTheWay({ shielded: true }), 1).state, false);
      expect(state.players[0]).toMatchObject({ position: 12, shielded: false, abilityCharge: LONG_ABILITY_CYCLE });
      expect(state.destroyedTraps).toEqual([]);
    });

    it("is offered for curses too, which the shield doesn't stop", () => {
      const { state } = roll(onTheWay({ position: 19, shielded: true, hand: cards("windStep") }), 1);
      expect(state.pendingWard?.threat).toBe("curse");
      expect(answer(state, true).state.players[0].hand).toHaveLength(1);
    });
  });
});
