import { describe, expect, it } from "vitest";
import { abilityCycle, LONG_ABILITY_CYCLE } from "../../abilities/charge";
import type { BoardDefinition } from "../../board/board";
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
import { INVERSION_TURNS } from "./inversion";
import { CONDENSER_CARDS } from "./condenser";
import { OPUS_PICKS, RAIDER_PICKS } from "./cards";

// 14: trap back to 10 · 16: lost turn · 24: advance to 28 · 26: extra turn · 30: card draw.
const BOARD: BoardDefinition = {
  size: 120,
  effects: {
    14: { kind: "trap", to: 10 },
    16: { kind: "skipTurn" },
    24: { kind: "advance", to: 28 },
    26: { kind: "extraTurn" },
    30: { kind: "card" },
  },
};

const duel = () => newGame(BOARD, { alchemist: "grandInversion", rival: "doubleCast" });
const inverted = (start = duel()) => activate(readyAbility(start, "alchemist"), "alchemist").state;
const withHand = (state: GameState, id: string, ...cardIds: Parameters<typeof card>[0][]) =>
  withPlayer(state, id, { hand: cardIds.map((cardId) => card(cardId)), energy: 10 });

describe("Great Alchemical Inversion", () => {
  it(`charges in ${LONG_ABILITY_CYCLE} turns and lasts ${INVERSION_TURNS} of her rounds`, () => {
    expect(abilityCycle("grandInversion")).toBe(LONG_ABILITY_CYCLE);
    let state = inverted();
    expect(state.inversion?.owner).toBe("alchemist");
    for (let round = 0; round <= INVERSION_TURNS; round++) {
      state = roll(onTurnOf(state, "alchemist"), "alchemist", 1).state;
    }
    expect(state.inversion).toBeNull();
  });

  it("turns a trap into an advance for her", () => {
    const state = withPlayer(inverted(), "alchemist", { position: 10 });
    const { state: after, events } = roll(onTurnOf(state, "alchemist"), "alchemist", 4);
    expect(eventsOfType(events, "tileInverted")[0]).toMatchObject({ outcome: "advance", amount: 4 });
    expect(playerOf(after, "alchemist").position).toBe(18);
  });

  it("turns a lost turn into as many extra turns, played straight after", () => {
    const state = withPlayer(inverted(), "alchemist", { position: 12 });
    const { state: after } = roll(onTurnOf(state, "alchemist"), "alchemist", 4);
    expect(playerOf(after, "alchemist").skipTurns).toBe(0);
    expect(after.players[after.currentPlayerIndex]?.id).toBe("alchemist");
    expect(playerOf(after, "alchemist").alchemist.extraTurns).toBe(0);
  });

  it("turns gifts into harms for her opponents: an advance pushes back, an extra turn is lost, a card is lost", () => {
    const base = withPlayers(inverted(), { rival: { position: 20 } });
    const pushed = roll(onTurnOf(base, "rival"), "rival", 4).state;
    expect(playerOf(pushed, "rival").position).toBe(20);
    const stuck = roll(onTurnOf(base, "rival"), "rival", 6).state;
    expect(playerOf(stuck, "rival").skipTurns).toBe(1);
    const held = withPlayer(onTurnOf(base, "rival"), "rival", { hand: [card("windStep")], position: 28 });
    const robbed = roll(held, "rival", 2).state;
    expect(playerOf(robbed, "rival").hand).toHaveLength(0);
  });

  it("leaves harms as they are for her opponents and gifts as they are for her", () => {
    const base = withPlayers(inverted(), { rival: { position: 10 }, alchemist: { position: 20 } });
    expect(playerOf(roll(onTurnOf(base, "rival"), "rival", 4).state, "rival").position).toBe(10);
    expect(playerOf(roll(onTurnOf(base, "alchemist"), "alchemist", 4).state, "alchemist").position).toBe(28);
  });
});

describe("Graveyard Condenser", () => {
  it(`opens her own graveyard once ${CONDENSER_CARDS} cards (anyone's) have gone there`, () => {
    const start = withPlayers(duel(), {
      alchemist: {
        discard: [card("luckyCharm", "mine")],
        alchemist: { condensed: CONDENSER_CARDS - 1, extraTurns: 0 },
      },
      rival: { hand: [card("healingHerb")], energy: 10 },
    });
    const { state } = play(onTurnOf(start, "rival"), "rival", "test:healingHerb");
    expect(state.pendingRaid).toMatchObject({ owner: "alchemist", picks: 1, own: true });
    const taken = send(state, { type: "raidGraveyard", playerId: "alchemist", cardUids: ["mine"] }).state;
    expect(playerOf(taken, "alchemist").hand.map((held) => held.uid)).toContain("mine");
    expect(playerOf(taken, "alchemist").alchemist.condensed).toBe(0);
    expect(taken.pendingRaid).toBeNull();
  });

  it("only offers her own graveyard", () => {
    const start = withPlayers(duel(), {
      alchemist: {
        discard: [card("luckyCharm", "mine")],
        alchemist: { condensed: CONDENSER_CARDS - 1, extraTurns: 0 },
      },
      rival: { hand: [card("healingHerb")], energy: 10 },
    });
    const { state } = play(onTurnOf(start, "rival"), "rival", "test:healingHerb");
    expectRuleError(
      () => send(state, { type: "raidGraveyard", playerId: "alchemist", cardUids: ["test:healingHerb"] }),
      "UNKNOWN_CARD",
    );
  });
});

describe("The Alchemist's cards", () => {
  it("Catalytic Step runs on to the first harm ahead and turns it in her favour", () => {
    const start = withPlayers(withHand(duel(), "alchemist", "catalyticStep"), { alchemist: { position: 5 } });
    const { state } = play(start, "alchemist", "test:catalyticStep");
    // On to the trap at 14, which sends her 4 ahead instead of 4 back.
    expect(playerOf(state, "alchemist").position).toBe(18);
  });

  it("Polarity Contamination runs the target on to the nearest gift, which turns on them", () => {
    const start = withPlayers(withHand(duel(), "alchemist", "polarityContamination"), { rival: { position: 21 } });
    const { state } = play(start, "alchemist", "test:polarityContamination", { targetId: "rival" });
    expect(playerOf(state, "rival").position).toBe(20);
  });

  it(`Graveyard Raider takes ${RAIDER_PICKS} cards from anyone's graveyard`, () => {
    const start = withPlayers(withHand(duel(), "alchemist", "graveyardRaider"), {
      rival: { discard: copies("berserkFury", 2, "theirs") },
    });
    const { state } = play(start, "alchemist", "test:graveyardRaider");
    expect(state.pendingRaid).toMatchObject({ owner: "alchemist", picks: RAIDER_PICKS, own: false });
    const taken = send(state, { type: "raidGraveyard", playerId: "alchemist", cardUids: ["theirs0", "theirs1"] });
    expect(playerOf(taken.state, "alchemist").hand.map((held) => held.cardId)).toEqual(["berserkFury", "berserkFury"]);
    expect(playerOf(taken.state, "rival").discard).toHaveLength(0);
  });

  it("Strict Equivalence trades places off a harm: it strikes the target and turns for her", () => {
    const start = withPlayers(withHand(duel(), "alchemist", "strictEquivalence"), {
      alchemist: { position: 14 },
      rival: { position: 40 },
    });
    const { state } = play(start, "alchemist", "test:strictEquivalence", { targetId: "rival" });
    expect(playerOf(state, "rival").position).toBe(10);
    expect(playerOf(state, "alchemist").position).toBe(44);
  });

  it("Strict Equivalence needs her on a harm", () => {
    const start = withPlayers(withHand(duel(), "alchemist", "strictEquivalence"), { alchemist: { position: 12 } });
    expectRuleError(
      () => play(start, "alchemist", "test:strictEquivalence", { targetId: "rival" }),
      "NOT_ON_HARM_TILE",
    );
  });

  it(`the Magnum Opus burns her hand, takes each opponent's best card and opens ${OPUS_PICKS} picks`, () => {
    const start = withPlayers(duel(), {
      alchemist: { hand: [card("magnumOpus"), card("windStep", "w")], energy: 10 },
      rival: { hand: [card("windStep", "cheap"), card("fateSwap", "best")] },
    });
    const { state } = play(start, "alchemist", "test:magnumOpus");
    expect(playerOf(state, "alchemist").hand).toHaveLength(0);
    expect(playerOf(state, "rival").hand.map((held) => held.uid)).toEqual(["cheap"]);
    expect(state.inversion?.owner).toBe("alchemist");
    expect(state.pendingRaid).toMatchObject({ picks: OPUS_PICKS, own: false });
  });
});

describe("Graveyard Condenser cap", () => {
  it("fills up to one pick, however many cards go at once", () => {
    const start = withPlayers(duel(), {
      alchemist: { discard: [card("luckyCharm", "mine")], alchemist: { condensed: 0, extraTurns: 0 } },
      rival: { hand: copies("windStep", 6, "w"), energy: 10 },
    });
    // Six cards burnt at once: still a single pick, and nothing banked for another.
    const burnt = withPlayer(start, "rival", { hand: [card("healingHerb")], discard: copies("windStep", 6, "w") });
    const { state } = play(
      onTurnOf(
        withPlayer(burnt, "alchemist", { alchemist: { condensed: CONDENSER_CARDS - 1, extraTurns: 0 } }),
        "rival",
      ),
      "rival",
      "test:healingHerb",
    );
    expect(state.pendingRaid).toMatchObject({ picks: 1, own: true });
    const taken = send(state, { type: "raidGraveyard", playerId: "alchemist", cardUids: ["mine"] }).state;
    expect(playerOf(taken, "alchemist").alchemist.condensed).toBe(0);
    expect(taken.pendingRaid).toBeNull();
  });
});
