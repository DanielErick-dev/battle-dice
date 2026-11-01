import { describe, expect, it } from "vitest";
import { VOID_CAPACITY } from "../characters/zarek/void";
import type { BoardDefinition } from "../board/board";
import { cardsOfLevel, MAX_RARITY_LEVEL } from "./catalog";
import { characterDeck, standardDeck } from "./decks";
import { BLINDFOLD_RANGE, GUILT_DISCARDS, SWORD_PUSH, SWORD_PUSH_AHEAD, VOID_HUNGER_CHARGE } from "./exclusive";
import {
  card,
  cards,
  eventsOfType,
  expectRuleError,
  newGame,
  play,
  playerOf,
  readyAbility,
  send,
  withPlayer,
  withPlayers,
} from "../testing";
import type { GameState, Player, PlayerId } from "../core/state";
import type { VoidItem } from "../characters/zarek/types";
import { BLIND_SCALE_ENERGY } from "../characters/themis/verdict";

/** A trap at 12 (back to 8), a lost turn at 20; everything else plain. */
const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 }, 20: { kind: "skipTurn" } } };

const holding = (state: GameState, playerId: PlayerId, ...ids: Parameters<typeof card>[0][]) =>
  withPlayer(state, playerId, { hand: ids.map((id) => card(id, id)) });

describe("characters' own cards", () => {
  it("join only their owner's deck, one copy each, and the aimed ones only with opponents", () => {
    const duel = characterDeck("silentVerdict", { withOpponents: true });
    expect(duel).toHaveLength(standardDeck({ withOpponents: true }).length + 4);
    expect(duel.filter((id) => id === "swordOfLaw")).toHaveLength(1);
    expect(characterDeck("silentVerdict", { withOpponents: false })).toContain("sacredBlindfold");
    expect(characterDeck("silentVerdict", { withOpponents: false })).not.toContain("swordOfLaw");
    expect(characterDeck("theVoid", { withOpponents: true })).not.toContain("swordOfLaw");
    expect(characterDeck(null, { withOpponents: true })).toEqual(standardDeck({ withOpponents: true }));

    const game = newGame(BOARD, { judge: "silentVerdict", zarek: "theVoid" });
    const owned = (player: Player) => [...player.hand, ...player.deck].map(({ cardId }) => cardId);
    expect(owned(playerOf(game, "judge"))).toContain("scalesOfJustice");
    expect(owned(playerOf(game, "judge"))).not.toContain("voidEcho");
    expect(owned(playerOf(game, "zarek"))).toContain("voidEcho");
  });

  it("never come out of transmutation or a gamble's pool", () => {
    for (let level = 1; level <= MAX_RARITY_LEVEL; level++) {
      const pool = cardsOfLevel(level, { withOpponents: true });
      expect(pool).not.toContain("scalesOfJustice");
      expect(pool).not.toContain("riftCall");
    }
  });

  it("are dead in anyone else's hand", () => {
    const start = holding(newGame(BOARD, { thief: null, judge: "silentVerdict" }), "thief", "sacredBlindfold");
    expectRuleError(() => play(withPlayer(start, "thief", { energy: 5 }), "thief", "sacredBlindfold"), "NOT_YOUR_CARD");
  });
});

describe("Themis's cards", () => {
  const court = (judge: Partial<Player> = {}, rival: Partial<Player> = {}) =>
    withPlayers(newGame(BOARD, { judge: "silentVerdict", rival: null }), {
      judge: { position: 30, energy: 10, ...judge },
      rival: { position: 40, ...rival },
    });

  it("Scales of Justice splits both energies evenly, the odd one hers", () => {
    const start = holding(court({ energy: 9 }, { energy: 2 }), "judge", "scalesOfJustice");
    const { state, events } = play(start, "judge", "scalesOfJustice", { targetId: "rival" });
    // She pays 3 first: 6 + 2 = 8, four each.
    expect(playerOf(state, "judge").energy).toBe(4);
    expect(playerOf(state, "rival").energy).toBe(4);
    expect(eventsOfType(events, "energyWeighed")).toEqual([
      { type: "energyWeighed", playerId: "judge", targetId: "rival", energy: 4, targetEnergy: 4 },
    ]);
  });

  it("Sword of Law strikes harder at whoever is ahead of her", () => {
    const ahead = play(holding(court(), "judge", "swordOfLaw"), "judge", "swordOfLaw", { targetId: "rival" });
    expect(playerOf(ahead.state, "rival").position).toBe(40 - SWORD_PUSH_AHEAD);

    const behind = court({}, { position: 25 });
    const struck = play(holding(behind, "judge", "swordOfLaw"), "judge", "swordOfLaw", { targetId: "rival" });
    expect(playerOf(struck.state, "rival").position).toBe(25 - SWORD_PUSH);
  });

  it("Weight of Guilt makes an opponent drop random cards", () => {
    const start = holding(court({}, { hand: cards("windStep", "luckyCharm", "oracleEye") }), "judge", "weightOfGuilt");
    const { state, events } = play(start, "judge", "weightOfGuilt", { targetId: "rival" });
    expect(playerOf(state, "rival").hand).toHaveLength(3 - GUILT_DISCARDS);
    expect(playerOf(state, "rival").discard).toHaveLength(GUILT_DISCARDS);
    expect(eventsOfType(events, "cardDiscarded")).toHaveLength(GUILT_DISCARDS);
  });

  it("Sacred Blindfold takes apart the hidden traps up ahead, for energy", () => {
    const start = { ...holding(court({ energy: 3 }), "judge", "sacredBlindfold"), hiddenTraps: [33, 40, 50] };
    const { state, events } = play(start, "judge", "sacredBlindfold");
    expect(30 + BLINDFOLD_RANGE).toBeLessThan(50);
    expect(state.hiddenTraps).toEqual([50]);
    expect(playerOf(state, "judge").energy).toBe(3 - 1 + 2 * BLIND_SCALE_ENERGY);
    expect(eventsOfType(events, "hiddenTrapDisarmed")).toHaveLength(2);
  });
});

describe("Zarek's cards", () => {
  const lair = (zarek: Partial<Player> = {}) =>
    withPlayers(newGame(BOARD, { zarek: "theVoid", rival: null }), {
      // Seated first, he'd start a step charged.
      zarek: { position: 5, energy: 10, abilityCharge: 0, ...zarek },
      rival: { position: 45 },
    });
  const trap: VoidItem = { kind: "trap", back: 4 };

  it("Void Hunger feeds the Void, and isn't needed once it's ready", () => {
    const { state, events } = play(holding(lair(), "zarek", "voidHunger"), "zarek", "voidHunger");
    expect(playerOf(state, "zarek").abilityCharge).toBe(VOID_HUNGER_CHARGE);
    expect(eventsOfType(events, "voidFed")).toEqual([
      { type: "voidFed", playerId: "zarek", charge: VOID_HUNGER_CHARGE },
    ]);

    const ready = holding(readyAbility(lair(), "zarek"), "zarek", "voidHunger");
    expectRuleError(() => play(ready, "zarek", "voidHunger"), "ABILITY_ALREADY_READY");
  });

  it("Hungry Rift swallows the first harm in sight ahead, keeping the charge", () => {
    const start = holding(lair({ abilityCharge: 1 }), "zarek", "hungryRift");
    const { state, events } = play(start, "zarek", "hungryRift");
    expect(playerOf(state, "zarek")).toMatchObject({ voidHold: [trap], abilityCharge: 1 });
    expect(state.destroyedTraps).toContain(12);
    expect(eventsOfType(events, "abilityUsed")).toEqual([]);

    // The lost turn at 20 is next, then nothing.
    const again = play(holding({ ...state, cardsPlayedThisTurn: 0 }, "zarek", "hungryRift"), "zarek", "hungryRift");
    expect(playerOf(again.state, "zarek").voidHold).toEqual([trap, { kind: "skipTurn" }]);
    const past = holding(lair({ position: 21 }), "zarek", "hungryRift");
    expectRuleError(() => play(past, "zarek", "hungryRift"), "NO_HARM_AHEAD");
    const full = holding(lair({ voidHold: Array(VOID_CAPACITY).fill(trap) }), "zarek", "hungryRift");
    expectRuleError(() => play(full, "zarek", "hungryRift"), "VOID_FULL");
  });

  it("Void Echo copies the last thing in the Void", () => {
    const start = holding(lair({ voidHold: [{ kind: "skipTurn" }, trap] }), "zarek", "voidEcho");
    const { state } = play(start, "zarek", "voidEcho");
    expect(playerOf(state, "zarek").voidHold).toEqual([{ kind: "skipTurn" }, trap, trap]);
    expectRuleError(() => play(holding(lair(), "zarek", "voidEcho"), "zarek", "voidEcho"), "VOID_EMPTY");
  });

  it("Rift Call drags an opponent back onto Zarek's rift, which strikes them", () => {
    const opened = send(lair({ voidHold: [trap] }), { type: "placeVoid", playerId: "zarek", index: 0, tile: 30 });
    const rift = opened.state.board.tiles.length;
    const { state, events } = play(holding(opened.state, "zarek", "riftCall"), "zarek", "riftCall", {
      targetId: "rival",
    });
    expect(eventsOfType(events, "cardTeleported")).toEqual([
      { type: "cardTeleported", playerId: "rival", from: 45, to: rift },
    ]);
    // Thrown back 4 from the rift: 30, 29, 28, 27.
    expect(playerOf(state, "rival").position).toBe(27);
    expect(eventsOfType(events, "trapTriggered")).toHaveLength(1);
  });

  it("Rift Call can't reach anyone without one of his rifts behind them", () => {
    const start = holding(lair(), "zarek", "riftCall");
    expectRuleError(() => play(start, "zarek", "riftCall", { targetId: "rival" }), "INVALID_TARGET");
  });

  it("aimed at an armed Themis, Rift Call is only undone", () => {
    const game = withPlayers(newGame(BOARD, { zarek: "theVoid", judge: "silentVerdict" }), {
      zarek: { position: 5, energy: 10, voidHold: [trap] },
      judge: { position: 45 },
    });
    const opened = send(game, { type: "placeVoid", playerId: "zarek", index: 0, tile: 30 });
    const armed = readyAbility(holding(opened.state, "zarek", "riftCall"), "judge");
    const { state, events } = play(armed, "zarek", "riftCall", { targetId: "judge" });
    expect(playerOf(state, "judge")).toMatchObject({ position: 45, abilityCharge: 0 });
    expect(playerOf(state, "zarek").position).toBe(5);
    expect(eventsOfType(events, "verdictPassed")).toHaveLength(1);
  });
});
