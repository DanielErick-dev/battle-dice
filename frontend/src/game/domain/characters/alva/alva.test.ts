import { describe, expect, it } from "vitest";
import { abilityBlocker } from "../../abilities/blocker";
import { abilityCycle, LONG_ABILITY_CYCLE } from "../../abilities/charge";
import type { BoardDefinition } from "../../board/board";
import { HAND_LIMIT } from "../../cards/hand";
import { projectState } from "../../core/projection";
import type { GameState } from "../../core/state";
import {
  activate,
  card,
  copies,
  eventsOfType,
  expectRuleError,
  newGame,
  onTurnOf,
  play,
  playerOf,
  readyAbility,
  roll,
  send,
  withPlayer,
  withPlayers,
} from "../../testing";
import { COLLAPSE_PER_CARD, FIREWALL_TURNS, HARVEST_PER_CARD, MALWARE_CARDS, THRUST_PER_OVERLOADED } from "./cards";
import { BLACKOUT_TURNS, OVERLOAD_BURN, OVERLOAD_ROUNDS } from "./systems";

const BOARD: BoardDefinition = { size: 120, effects: {} };

const trio = () => newGame(BOARD, { alva: "empPulse", rival: "doubleCast", other: "doubleCast" });
const withHand = (state: GameState, id: string, ...cardIds: Parameters<typeof card>[0][]) =>
  withPlayer(state, id, { hand: cardIds.map((cardId) => card(cardId)), energy: 10 });
/** Passes turns round the table without moving anyone far. */
const roundOf = (state: GameState) => {
  let next = state;
  for (let seat = 0; seat < state.players.length; seat++) {
    const current = next.players[next.currentPlayerIndex]?.id ?? "";
    next = roll(next, current, 1).state;
  }
  return next;
};

describe("EMP", () => {
  it(`charges in ${LONG_ABILITY_CYCLE} turns`, () => {
    expect(abilityCycle("empPulse")).toBe(LONG_ABILITY_CYCLE);
  });

  it(`locks opponents' cards and abilities for ${BLACKOUT_TURNS} of their turns, then halves moving cards`, () => {
    let state = activate(readyAbility(trio(), "alva"), "alva").state;
    state = roll(state, "alva", 1).state;
    // Rival's first and second turns: dark.
    for (let turn = 0; turn < BLACKOUT_TURNS; turn++) {
      const rival = playerOf(withHand(state, "rival", "windStep"), "rival");
      expect(abilityBlocker(readyAbility(state, "rival").players[1]!)).toBe("BLACKED_OUT");
      expectRuleError(() => play(withHand(state, "rival", "windStep"), "rival", "test:windStep"), "BLACKED_OUT");
      expect(rival.emp).toBeGreaterThan(0);
      state = roundOf(state);
    }
    // Third: the Brownout halves Wind Step.
    const before = playerOf(state, "rival").position;
    const { state: after, events } = play(withHand(state, "rival", "windStep"), "rival", "test:windStep");
    expect(eventsOfType(events, "brownoutSapped")).toHaveLength(1);
    const sapped = eventsOfType(events, "brownoutSapped")[0]!;
    expect(playerOf(after, "rival").position - before).toBe(sapped.to);
  });

  it("holds her own charge until the EMP is over", () => {
    let state = activate(readyAbility(trio(), "alva"), "alva").state;
    state = roll(state, "alva", 1).state;
    for (let round = 0; round < BLACKOUT_TURNS + 1; round++) state = roundOf(state);
    expect(playerOf(state, "alva").abilityCharge).toBe(0);
    state = roundOf(state);
    expect(playerOf(state, "alva").abilityCharge).toBe(1);
  });
});

describe("Memory Overload", () => {
  it(`every ${OVERLOAD_ROUNDS} of her turns burns ${OVERLOAD_BURN} real cards from hands above 5, never a Corrupted one`, () => {
    let state = withPlayers(trio(), {
      rival: { hand: copies("windStep", 4, "r"), corrupted: 2 },
      other: { hand: copies("windStep", 5, "o") },
    });
    // Her first turn is already under way: OVERLOAD_ROUNDS more starts set it off.
    for (let round = 0; round < OVERLOAD_ROUNDS; round++) state = roundOf(state);
    expect(playerOf(state, "rival").hand).toHaveLength(0);
    expect(playerOf(state, "rival").corrupted).toBe(2);
    expect(playerOf(state, "other").hand).toHaveLength(5);
  });
});

describe("Corrupted Cards", () => {
  it(`the Malware Injection puts ${MALWARE_CARDS} in the target's hand, past its limit`, () => {
    const start = withPlayers(withHand(trio(), "alva", "malwareInjection"), {
      rival: { hand: copies("windStep", HAND_LIMIT, "r") },
    });
    const { state } = play(start, "alva", "test:malwareInjection", { targetId: "rival" });
    expect(playerOf(state, "rival")).toMatchObject({ corrupted: MALWARE_CARDS });
    expect(playerOf(state, "rival").hand).toHaveLength(HAND_LIMIT);
  });

  it("let her see the hand they sit in", () => {
    const start = withPlayers(trio(), { rival: { hand: [card("windStep")], corrupted: 1 } });
    expect(playerOf(projectState(start, "alva"), "rival").hand[0]?.cardId).toBe("windStep");
    expect(playerOf(projectState(start, "other"), "rival").hand[0]?.cardId).not.toBe("windStep");
    expect(playerOf(projectState(start, "alva"), "other").hand.every((held) => held.cardId !== "windStep")).toBe(true);
  });

  it("are deleted one at a time, each taking a real card along", () => {
    const start = withPlayers(onTurnOf(trio(), "rival"), { rival: { hand: [card("windStep", "w")], corrupted: 2 } });
    const { state } = send(start, { type: "purgeCorrupted", playerId: "rival", cardUid: "w" });
    expect(playerOf(state, "rival")).toMatchObject({ corrupted: 1, hand: [] });
    expect(playerOf(state, "rival").discard.map((held) => held.uid)).toContain("w");
  });

  it("can't be deleted while silenced", () => {
    const start = withPlayers(onTurnOf(trio(), "rival"), {
      rival: { hand: [card("windStep", "w")], corrupted: 1, silencedTurns: 1 },
    });
    expectRuleError(() => send(start, { type: "purgeCorrupted", playerId: "rival", cardUid: "w" }), "SILENCED");
  });
});

describe("Unidade Alva's cards", () => {
  it(`the Overload Thruster flies ${THRUST_PER_OVERLOADED} per overloaded opponent`, () => {
    const start = withPlayers(withHand(trio(), "alva", "overloadThruster"), {
      rival: { hand: copies("windStep", 6, "r") },
      other: { hand: copies("windStep", 4, "o"), corrupted: 2 },
    });
    const { state } = play(start, "alva", "test:overloadThruster");
    expect(playerOf(state, "alva").position - playerOf(start, "alva").position).toBe(2 * THRUST_PER_OVERLOADED);
  });

  it("the Overload Thruster needs an overloaded opponent", () => {
    const start = withPlayers(withHand(trio(), "alva", "overloadThruster"), {
      rival: { hand: [] },
      other: { hand: [] },
    });
    expectRuleError(() => play(start, "alva", "test:overloadThruster"), "NO_OVERLOADED_OPPONENT");
  });

  it(`the Firewall Lock keeps the target's cards locked for ${FIREWALL_TURNS} of their turns`, () => {
    const start = withHand(trio(), "alva", "firewallLock");
    let state = play(start, "alva", "test:firewallLock", { targetId: "rival" }).state;
    state = roll(state, "alva", 1).state;
    for (let turn = 0; turn < FIREWALL_TURNS; turn++) {
      expectRuleError(() => play(withHand(state, "rival", "windStep"), "rival", "test:windStep"), "SILENCED");
      state = roundOf(state);
    }
    expect(() => play(withHand(state, "rival", "windStep"), "rival", "test:windStep")).not.toThrow();
  });

  it(`the Data Collapse sends the target back ${COLLAPSE_PER_CARD} per card in hand, Corrupted ones too`, () => {
    const start = withPlayers(withHand(trio(), "alva", "dataCollapse"), {
      rival: { position: 40, hand: copies("windStep", 3, "r"), corrupted: 2 },
    });
    const { state } = play(start, "alva", "test:dataCollapse", { targetId: "rival" });
    expect(playerOf(state, "rival").position).toBe(40 - 5 * COLLAPSE_PER_CARD);
  });

  it(`the Apocalypse Protocol infects everyone, sets off the Overload and flies ${HARVEST_PER_CARD} per card burnt`, () => {
    const start = withPlayers(withHand(trio(), "alva", "apocalypseProtocol"), {
      rival: { hand: copies("windStep", 4, "r") },
      other: { hand: copies("windStep", 3, "o") },
    });
    const { state } = play(start, "alva", "test:apocalypseProtocol");
    expect(playerOf(state, "rival")).toMatchObject({ corrupted: MALWARE_CARDS, hand: [] });
    expect(playerOf(state, "other").hand).toHaveLength(3);
    expect(playerOf(state, "alva").position - playerOf(start, "alva").position).toBe(4 * HARVEST_PER_CARD);
  });
});
