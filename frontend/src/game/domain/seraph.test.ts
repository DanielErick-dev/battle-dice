import { describe, expect, it } from "vitest";
import { abilityCycle, type AbilityId } from "./abilities";
import type { BoardDefinition } from "./board";
import { SERAPH_BLESSING_TURNS } from "./blessings";
import { CROWN_BONUS, DIVINE_CHAINS_ROUNDS, dragTargets } from "./seraph";
import { activate, card, newGame, onTurnOf, play, playerOf, readyAbility, roll, send, withPlayer } from "./testing";
import type { GameState } from "./types";

/**
 * Hell through the portal on 20 (out at 25), heaven through the one on 40 (out at 45); traps at 50 and 55.
 * Hell's tiles are laid out first (61–78), then heaven's (79–96).
 */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    20: { kind: "portal", to: 25, realm: "infernal" },
    40: { kind: "portal", to: 45, realm: "celestial" },
    50: { kind: "trap", to: 46 },
    55: { kind: "trap", to: 51 },
  },
};
const HELL = 61;
/** Hell's second tile costs a turn. */
const HELL_SKIP = 62;
/** Heaven's first tile holds the Ascension relic, its second the Spring of Light. */
const HEAVEN_RELIC = 79;
const HEAVEN_SPRING = 80;
/** Heaven's fourth tile holds the Celestial Light relic. */
const HEAVEN_LIGHT = 82;
const HEAVEN_LAST = 96;

const duel = (ability: AbilityId = "seraphBlessing") => newGame(BOARD, { hero: ability, rival: "studySession" });
const solo = (ability: AbilityId = "seraphBlessing") => newGame(BOARD, { hero: ability });
const fallen = (state: GameState) => withPlayer(state, "hero", { ability: "hellsDrag" });
const drag = (state: GameState, targetId?: string) =>
  activate(withPlayer(state, "hero", { abilityCharge: abilityCycle("hellsDrag") }), "hero", { targetId });

describe("Seraphiel in heaven", () => {
  it("picks which blessing he receives on a blessing tile, and it lasts SERAPH_BLESSING_TURNS rounds", () => {
    const offered = roll(withPlayer(solo(), "hero", { position: HEAVEN_RELIC }), "hero", 1);
    expect(offered.events).toContainEqual({
      type: "graceOffered",
      playerId: "hero",
      tile: HEAVEN_SPRING,
      offer: "blessing",
    });
    expect(offered.state.pendingGrace).toMatchObject({
      playerId: "hero",
      offer: "blessing",
      endsTurn: true,
    });
    expect(playerOf(offered.state, "hero").blessings).toEqual([]);
    expect(() => roll(offered.state, "hero", 1)).toThrow("GRACE_PENDING");

    const { state } = send(offered.state, {
      type: "chooseGrace",
      playerId: "hero",
      blessing: "halo",
    });
    expect(state.pendingGrace).toBeNull();
    // Still in heaven: it waits there, untouched, until he leaves.
    expect(playerOf(state, "hero").blessings).toEqual([
      { kind: "halo", turnsLeft: SERAPH_BLESSING_TURNS, fresh: true },
    ]);
  });

  it("picks any of heaven's relics on a relic tile", () => {
    const offered = roll(withPlayer(solo(), "hero", { position: HEAVEN_LIGHT - 1, hand: [] }), "hero", 1);
    expect(offered.state.pendingGrace).toMatchObject({
      offer: "relic",
      tile: HEAVEN_LIGHT,
    });
    const { state } = send(offered.state, {
      type: "chooseGrace",
      playerId: "hero",
      cardId: "heavenlyAegis",
    });
    expect(playerOf(state, "hero").hand.map((card) => card.cardId)).toEqual(["heavenlyAegis"]);
  });

  it("refuses a gift that isn't on offer", () => {
    const offered = roll(withPlayer(solo(), "hero", { position: HEAVEN_RELIC }), "hero", 1);
    expect(() =>
      send(offered.state, {
        type: "chooseGrace",
        playerId: "hero",
        cardId: "ascension",
      }),
    ).toThrow("INVALID_GRACE");
  });

  it("anyone else just receives the tile's blessing", () => {
    const { state } = roll(withPlayer(solo("studySession"), "hero", { position: HEAVEN_RELIC }), "hero", 1);
    expect(state.pendingGrace).toBeNull();
    expect(playerOf(state, "hero").blessings.map((blessing) => blessing.kind)).toEqual(["spring"]);
  });

  it("his ability's blessing lasts SERAPH_BLESSING_TURNS rounds too", () => {
    const { state } = activate(readyAbility(solo(), "hero"), "hero");
    expect(playerOf(state, "hero").blessings[0].turnsLeft).toBe(SERAPH_BLESSING_TURNS);
  });

  it("comes out of heaven wearing the Seraphic Crown, CROWN_BONUS tiles on every roll", () => {
    const { state, events } = roll(withPlayer(solo(), "hero", { position: HEAVEN_LAST }), "hero", 1);
    expect(playerOf(state, "hero").position).toBe(45);
    expect(playerOf(state, "hero").crown).toBe("seraphic");
    expect(events).toContainEqual({
      type: "crownGained",
      playerId: "hero",
      crown: "seraphic",
    });

    const next = roll(state, "hero", 1);
    expect(playerOf(next.state, "hero").position).toBe(45 + 1 + CROWN_BONUS);
  });
});

describe("the Fall", () => {
  it("setting foot in hell makes Seraphiel the Fallen Angel for good", () => {
    const blessed = withPlayer(solo(), "hero", {
      position: 19,
      blessings: [{ kind: "halo", turnsLeft: 4, fresh: false }],
    });
    const { state, events } = roll(blessed, "hero", 1);
    expect(playerOf(state, "hero").position).toBe(HELL);
    expect(playerOf(state, "hero").ability).toBe("hellsDrag");
    expect(playerOf(state, "hero").blessings).toEqual([]);
    expect(playerOf(state, "hero").crown).toBe("infernal");
    expect(events).toContainEqual({
      type: "seraphFell",
      playerId: "hero",
      tile: HELL,
    });
  });

  it("crowns him infernal even if he never wore the seraphic crown", () => {
    const { state } = roll(withPlayer(solo(), "hero", { position: 19 }), "hero", 1);
    expect(playerOf(state, "hero").crown).toBe("infernal");
  });

  it("hell can't harm the Fallen Angel", () => {
    const { state, events } = roll(withPlayer(fallen(duel()), "hero", { position: HELL }), "hero", 1);
    expect(playerOf(state, "hero").skipTurns).toBe(0);
    expect(events).toContainEqual({
      type: "trapBlocked",
      playerId: "hero",
      tile: HELL_SKIP,
      ward: "fallen",
      hidden: false,
    });
  });

  it("hell still harms anyone else", () => {
    const { state } = roll(withPlayer(duel("studySession"), "hero", { position: HELL }), "hero", 1);
    expect(playerOf(state, "hero").skipTurns).toBe(1);
  });

  it("heaven is shut to the Fallen Angel, and its chains hold him", () => {
    const { state, events } = roll(withPlayer(fallen(duel()), "hero", { position: 39 }), "hero", 1);
    expect(playerOf(state, "hero").position).toBe(40);
    expect(playerOf(state, "hero")).toMatchObject({
      skipTurns: DIVINE_CHAINS_ROUNDS,
      chained: DIVINE_CHAINS_ROUNDS,
    });
    expect(events).toContainEqual({
      type: "heavenBarred",
      playerId: "hero",
      tile: 40,
      rounds: DIVINE_CHAINS_ROUNDS,
    });
  });

  it("the chains loosen a round at a time as his turns are lost", () => {
    const chained = roll(withPlayer(fallen(duel()), "hero", { position: 39 }), "hero", 1).state;
    const { state } = roll(withPlayer(chained, "rival", { position: 2 }), "rival", 1);
    expect(playerOf(state, "hero")).toMatchObject({
      skipTurns: DIVINE_CHAINS_ROUNDS - 1,
      chained: DIVINE_CHAINS_ROUNDS - 1,
    });
  });
});

describe("Hell's Drag", () => {
  it("pulls the chosen opponent down into hell, to come out where they were taken from", () => {
    const state = withPlayer(fallen(duel()), "rival", { position: 30 });
    const { state: after, events } = drag(state, "rival");
    expect(playerOf(after, "rival").position).toBe(HELL);
    expect(playerOf(after, "rival").realmEntry).toEqual({ portal: 30, exit: 30 });
    // Out at the far end of hell: back on tile 30.
    const rivalsTurn = onTurnOf(withPlayer(after, "rival", { position: 78 }), "rival");
    const out = roll(rivalsTurn, "rival", 1);
    expect(playerOf(out.state, "rival").position).toBe(30);
    expect(events).toContainEqual({
      type: "hellDragged",
      playerId: "hero",
      targetId: "rival",
      from: 30,
      to: HELL,
    });
  });

  it("can't reach anyone already in heaven or hell; the armoured turn it away", () => {
    const base = fallen(duel());
    expect(dragTargets(base.board, withPlayer(base, "rival", { position: HEAVEN_SPRING }).players, "hero")).toEqual([]);
    const { state, events } = drag(withPlayer(base, "rival", { untamed: 2 }), "rival");
    expect(events).toContainEqual(expect.objectContaining({ type: "abilityBlocked", ward: "untamed" }));
    expect(playerOf(state, "rival").position).toBe(playerOf(base, "rival").position);
  });

  it("needs a target when there is one", () => {
    expect(() => drag(fallen(duel()))).toThrow("INVALID_TARGET");
  });

  it("alone, hell swallows the traps ahead", () => {
    const { state, events } = drag(withPlayer(fallen(solo()), "hero", { position: 45 }));
    expect(state.destroyedTraps).toEqual([50, 55]);
    expect(events.filter((event) => event.type === "trapDestroyed")).toHaveLength(2);
  });
});

describe("Call of the Abyss (card)", () => {
  const withCard = (state: GameState) =>
    withPlayer(state, "hero", {
      hand: [card("abyssCall", "abyss")],
      energy: 10,
    });
  const callAbyss = (state: GameState, targetId: string) => play(withCard(state), "hero", "abyss", { targetId });

  it("pulls the opponent down into hell, to come out where they were", () => {
    const { state, events } = callAbyss(withPlayer(duel("studySession"), "rival", { position: 30 }), "rival");
    expect(playerOf(state, "rival")).toMatchObject({
      position: HELL,
      realmEntry: { portal: 30, exit: 30 },
    });
    expect(events).toContainEqual({
      type: "hellDragged",
      playerId: "hero",
      targetId: "rival",
      from: 30,
      to: HELL,
    });
  });

  it("is turned away by armour, and spent", () => {
    const { state, events } = callAbyss(
      withPlayer(duel("studySession"), "rival", { position: 30, spectralArmour: 2 }),
      "rival",
    );
    expect(playerOf(state, "rival").position).toBe(30);
    expect(playerOf(state, "hero").hand).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({ type: "cardBlocked", cardId: "abyssCall" }));
  });

  it("can't reach someone already in a realm", () => {
    expect(() => callAbyss(withPlayer(duel("studySession"), "rival", { position: HEAVEN_SPRING }), "rival")).toThrow();
  });
});
