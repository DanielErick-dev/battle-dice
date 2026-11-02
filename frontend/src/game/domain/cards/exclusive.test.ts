import { describe, expect, it } from "vitest";
import { VOID_CAPACITY } from "../characters/zarek/void";
import type { BoardDefinition } from "../board/board";
import { cardsOfLevel, MAX_RARITY_LEVEL } from "./catalog";
import { characterDeck, standardDeck } from "./decks";
import { VOID_HUNGER_CHARGE } from "./exclusive";
import { VERDICT_CHARGE } from "../characters/themis/verdict";
import { CONFISCATED_CARDS, CONTAINED_DIE, DECREE_ROLLS, JUSTICE_MARCH } from "../characters/themis/cards";
import {
  card,
  cards,
  eventsOfType,
  expectRuleError,
  newGame,
  play,
  playerOf,
  readyAbility,
  roll,
  send,
  withPlayer,
  withPlayers,
} from "../testing";
import type { GameState, Player, PlayerId } from "../core/state";
import type { VoidItem } from "../characters/zarek/types";

/** A trap at 12 (back to 8), a lost turn at 20; everything else plain. */
const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 }, 20: { kind: "skipTurn" } } };

const holding = (state: GameState, playerId: PlayerId, ...ids: Parameters<typeof card>[0][]) =>
  withPlayer(state, playerId, { hand: ids.map((id) => card(id, id)) });

describe("characters' own cards", () => {
  it("join only their owner's deck, one copy each, and the aimed ones only with opponents", () => {
    const duel = characterDeck("silentVerdict", { withOpponents: true });
    expect(duel).toHaveLength(standardDeck({ withOpponents: true }).length + 5);
    expect(duel.filter((id) => id === "confiscation")).toHaveLength(1);
    expect(characterDeck("silentVerdict", { withOpponents: false })).toContain("blindJustice");
    expect(characterDeck("silentVerdict", { withOpponents: false })).not.toContain("confiscation");
    expect(characterDeck("theVoid", { withOpponents: true })).not.toContain("confiscation");
    expect(characterDeck(null, { withOpponents: true })).toEqual(standardDeck({ withOpponents: true }));

    const game = newGame(BOARD, { judge: "silentVerdict", zarek: "theVoid" });
    const owned = (player: Player) => [...player.hand, ...player.deck].map(({ cardId }) => cardId);
    expect(owned(playerOf(game, "judge"))).toContain("finalJudgment");
    expect(owned(playerOf(game, "judge"))).not.toContain("voidEcho");
    expect(owned(playerOf(game, "zarek"))).toContain("voidEcho");
  });

  it("never come out of transmutation or a gamble's pool", () => {
    for (let level = 1; level <= MAX_RARITY_LEVEL; level++) {
      const pool = cardsOfLevel(level, { withOpponents: true });
      expect(pool).not.toContain("finalJudgment");
      expect(pool).not.toContain("riftCall");
    }
  });

  it("are dead in anyone else's hand", () => {
    const start = holding(newGame(BOARD, { thief: null, judge: "silentVerdict" }), "thief", "blindJustice");
    expectRuleError(() => play(withPlayer(start, "thief", { energy: 5 }), "thief", "blindJustice"), "NOT_YOUR_CARD");
  });
});

describe("Themis's cards", () => {
  const court = (judge: Partial<Player> = {}, rival: Partial<Player> = {}) =>
    withPlayers(newGame(BOARD, { judge: "silentVerdict", rival: null }), {
      judge: { position: 30, energy: 10, ...judge },
      rival: { position: 40, ...rival },
    });

  it("Blind Justice walks everyone ahead from her on, each landing resolved, with no roll", () => {
    const start = holding(court({ position: 8 }, { position: 16 }), "judge", "blindJustice");
    const { state, events } = play(start, "judge", "blindJustice");
    // The rival lands on the lost turn at 20; she lands on the trap at 12 and is sent back to 8.
    expect(playerOf(state, "judge").position).toBe(8);
    expect(playerOf(state, "rival")).toMatchObject({ position: 8 + 12, skipTurns: 1 });
    expect(eventsOfType(events, "justiceMarched")).toEqual([
      { type: "justiceMarched", playerId: "judge", tiles: JUSTICE_MARCH, order: ["judge", "rival"] },
    ]);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it("Blind Justice walking someone over the line makes them the winner", () => {
    const start = holding(court({}, { position: 58 }), "judge", "blindJustice");
    const { state } = play(start, "judge", "blindJustice");
    expect(state).toMatchObject({ status: "finished", winnerId: "rival" });
  });

  it("Confiscation takes random cards of the target's into her hand", () => {
    const start = holding(court({}, { hand: cards("oracleEye", "windStep", "luckyCharm") }), "judge", "confiscation");
    const { state, events } = play(start, "judge", "confiscation", { targetId: "rival" });
    expect(playerOf(state, "rival").hand).toHaveLength(3 - CONFISCATED_CARDS);
    expect(playerOf(state, "judge").hand).toHaveLength(CONFISCATED_CARDS);
    expect(eventsOfType(events, "cardsStolen")).toHaveLength(1);
  });

  it("Mark of Justice marks every opponent, readying her verdict for their next attack", () => {
    const { state } = play(holding(court(), "judge", "justiceMark"), "judge", "justiceMark");
    expect(playerOf(state, "rival").justiceMarks).toBe(1);
    expect(playerOf(state, "judge").justiceMarks).toBe(0);
  });

  it("the Containment Decree keeps opponents' dice at 3 or under for a few rolls", () => {
    const start = holding(court(), "judge", "containmentDecree");
    const decreed = play(start, "judge", "containmentDecree");
    expect(playerOf(decreed.state, "judge").energy).toBe(10 - 3);
    expect(playerOf(decreed.state, "rival").containedRolls).toBe(DECREE_ROLLS);
    const rolled = roll({ ...decreed.state, currentPlayerIndex: 1 }, "rival", 6);
    expect(eventsOfType(rolled.events, "diceRolled")[0].value).toBe(CONTAINED_DIE);
    expect(playerOf(rolled.state, "rival").containedRolls).toBe(DECREE_ROLLS - 1);
  });

  it("the Final Judgment leaps her a die of tiles per three between them, burning another card", () => {
    const start = withPlayer(
      holding(court({ position: 22 }, { position: 30 }), "judge", "finalJudgment", "windStep"),
      "judge",
      {
        energy: 6,
      },
    );
    // 8 tiles apart: ceil(8 / 3) = 3 dice of a 4.
    const command = {
      type: "playCard",
      playerId: "judge",
      cardUid: "finalJudgment",
      targetId: "rival",
      sacrificeUids: ["windStep"],
    } as const;
    const { state, events } = send(start, command, [4]);
    expect(eventsOfType(events, "finalJudgment")).toEqual([
      { type: "finalJudgment", playerId: "judge", targetId: "rival", distance: 8, die: 4, tiles: 12 },
    ]);
    expect(playerOf(state, "judge")).toMatchObject({ position: 34, energy: 1, hand: [] });
    expect(playerOf(state, "rival").position).toBe(30);
  });

  it("the Final Judgment needs another card to burn", () => {
    const start = holding(court(), "judge", "finalJudgment");
    expectRuleError(
      () => play(start, "judge", "finalJudgment", { targetId: "rival", sacrificeUids: [] }),
      "NO_SACRIFICE",
    );
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
    expect(playerOf(state, "judge")).toMatchObject({ position: 45, abilityCharge: VERDICT_CHARGE });
    expect(playerOf(state, "zarek").position).toBe(5);
    expect(eventsOfType(events, "verdictPassed")).toHaveLength(1);
  });
});
