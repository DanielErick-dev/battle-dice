import { describe, expect, it } from "vitest";
import { abilityCycle, type AbilityId } from "./abilities";
import type { BoardDefinition } from "./board";
import { SERAPH_BLESSING_TURNS } from "./blessings";
import type { GameCommand } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import { CROWN_BONUS, DIVINE_CHAINS_ROUNDS, dragTargets } from "./seraph";
import type { GameState, Player } from "./types";

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

const duel = (ability: AbilityId = "seraphBlessing") =>
  createGame(
    BOARD,
    [
      { id: "hero", name: "Seraphiel", ability },
      { id: "rival", name: "Rival", ability: "studySession" },
    ],
    { random: seededRandom(7) },
  );
const solo = (ability: AbilityId = "seraphBlessing") =>
  createGame(BOARD, [{ id: "hero", name: "Seraphiel", ability }], {
    random: seededRandom(7),
  });
function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)),
  };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, {
    rollDice: sequenceDice(dice),
    random: seededRandom(3),
  });
const player = (state: GameState, id = "hero") => state.players.find((candidate) => candidate.id === id)!;
const roll = (state: GameState, die: number) => send(state, { type: "rollDice", playerId: "hero" }, [die]);
const fallen = (state: GameState) => patch(state, "hero", { ability: "hellsDrag" });
const drag = (state: GameState, targetId?: string) =>
  send(patch(state, "hero", { abilityCharge: abilityCycle("hellsDrag") }), {
    type: "activateAbility",
    playerId: "hero",
    targetId,
  });

describe("Seraphiel in heaven", () => {
  it("picks which blessing he receives on a blessing tile, and it lasts SERAPH_BLESSING_TURNS rounds", () => {
    const offered = roll(patch(solo(), "hero", { position: HEAVEN_RELIC }), 1);
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
    expect(player(offered.state).blessings).toEqual([]);
    expect(() => roll(offered.state, 1)).toThrow("GRACE_PENDING");

    const { state } = send(offered.state, {
      type: "chooseGrace",
      playerId: "hero",
      blessing: "halo",
    });
    expect(state.pendingGrace).toBeNull();
    // Still in heaven: it waits there, untouched, until he leaves.
    expect(player(state).blessings).toEqual([{ kind: "halo", turnsLeft: SERAPH_BLESSING_TURNS, fresh: true }]);
  });

  it("picks any of heaven's relics on a relic tile", () => {
    const offered = roll(patch(solo(), "hero", { position: HEAVEN_LIGHT - 1, hand: [] }), 1);
    expect(offered.state.pendingGrace).toMatchObject({
      offer: "relic",
      tile: HEAVEN_LIGHT,
    });
    const { state } = send(offered.state, {
      type: "chooseGrace",
      playerId: "hero",
      cardId: "heavenlyAegis",
    });
    expect(player(state).hand.map((card) => card.cardId)).toEqual(["heavenlyAegis"]);
  });

  it("refuses a gift that isn't on offer", () => {
    const offered = roll(patch(solo(), "hero", { position: HEAVEN_RELIC }), 1);
    expect(() =>
      send(offered.state, {
        type: "chooseGrace",
        playerId: "hero",
        cardId: "ascension",
      }),
    ).toThrow("INVALID_GRACE");
  });

  it("anyone else just receives the tile's blessing", () => {
    const { state } = roll(patch(solo("studySession"), "hero", { position: HEAVEN_RELIC }), 1);
    expect(state.pendingGrace).toBeNull();
    expect(player(state).blessings.map((blessing) => blessing.kind)).toEqual(["spring"]);
  });

  it("his ability's blessing lasts SERAPH_BLESSING_TURNS rounds too", () => {
    const { state } = send(patch(solo(), "hero", { abilityCharge: abilityCycle("seraphBlessing") }), {
      type: "activateAbility",
      playerId: "hero",
    });
    expect(player(state).blessings[0].turnsLeft).toBe(SERAPH_BLESSING_TURNS);
  });

  it("comes out of heaven wearing the Seraphic Crown, CROWN_BONUS tiles on every roll", () => {
    const { state, events } = roll(patch(solo(), "hero", { position: HEAVEN_LAST }), 1);
    expect(player(state).position).toBe(45);
    expect(player(state).crown).toBe("seraphic");
    expect(events).toContainEqual({
      type: "crownGained",
      playerId: "hero",
      crown: "seraphic",
    });

    const next = roll(state, 1);
    expect(player(next.state).position).toBe(45 + 1 + CROWN_BONUS);
  });
});

describe("the Fall", () => {
  it("setting foot in hell makes Seraphiel the Fallen Angel for good", () => {
    const blessed = patch(solo(), "hero", {
      position: 19,
      blessings: [{ kind: "halo", turnsLeft: 4, fresh: false }],
    });
    const { state, events } = roll(blessed, 1);
    expect(player(state).position).toBe(HELL);
    expect(player(state).ability).toBe("hellsDrag");
    expect(player(state).blessings).toEqual([]);
    expect(player(state).crown).toBe("infernal");
    expect(events).toContainEqual({
      type: "seraphFell",
      playerId: "hero",
      tile: HELL,
    });
  });

  it("crowns him infernal even if he never wore the seraphic crown", () => {
    const { state } = roll(patch(solo(), "hero", { position: 19 }), 1);
    expect(player(state).crown).toBe("infernal");
  });

  it("hell can't harm the Fallen Angel", () => {
    const { state, events } = roll(patch(fallen(duel()), "hero", { position: HELL }), 1);
    expect(player(state).skipTurns).toBe(0);
    expect(events).toContainEqual({
      type: "trapBlocked",
      playerId: "hero",
      tile: HELL_SKIP,
      ward: "fallen",
      hidden: false,
    });
  });

  it("hell still harms anyone else", () => {
    const { state } = roll(patch(duel("studySession"), "hero", { position: HELL }), 1);
    expect(player(state).skipTurns).toBe(1);
  });

  it("heaven is shut to the Fallen Angel, and its chains hold him", () => {
    const { state, events } = roll(patch(fallen(duel()), "hero", { position: 39 }), 1);
    expect(player(state).position).toBe(40);
    expect(player(state)).toMatchObject({
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
    const chained = roll(patch(fallen(duel()), "hero", { position: 39 }), 1).state;
    const { state } = send(patch(chained, "rival", { position: 2 }), { type: "rollDice", playerId: "rival" }, [1]);
    expect(player(state)).toMatchObject({
      skipTurns: DIVINE_CHAINS_ROUNDS - 1,
      chained: DIVINE_CHAINS_ROUNDS - 1,
    });
  });
});

describe("Hell's Drag", () => {
  it("pulls the chosen opponent down into hell, to come out where they were taken from", () => {
    const state = patch(fallen(duel()), "rival", { position: 30 });
    const { state: after, events } = drag(state, "rival");
    expect(player(after, "rival").position).toBe(HELL);
    expect(player(after, "rival").realmEntry).toEqual({ portal: 30, exit: 30 });
    // Out at the far end of hell: back on tile 30.
    const rivalsTurn = {
      ...patch(after, "rival", { position: 78 }),
      currentPlayerIndex: 1,
    };
    const out = send(rivalsTurn, { type: "rollDice", playerId: "rival" }, [1]);
    expect(player(out.state, "rival").position).toBe(30);
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
    expect(dragTargets(base.board, patch(base, "rival", { position: HEAVEN_SPRING }).players, "hero")).toEqual([]);
    const { state, events } = drag(patch(base, "rival", { untamed: 2 }), "rival");
    expect(events).toContainEqual(expect.objectContaining({ type: "abilityBlocked", ward: "untamed" }));
    expect(state.players.find((player) => player.id === "rival")?.position).toBe(
      base.players.find((player) => player.id === "rival")?.position,
    );
  });

  it("needs a target when there is one", () => {
    expect(() => drag(fallen(duel()))).toThrow("INVALID_TARGET");
  });

  it("alone, hell swallows the traps ahead", () => {
    const { state, events } = drag(patch(fallen(solo()), "hero", { position: 45 }));
    expect(state.destroyedTraps).toEqual([50, 55]);
    expect(events.filter((event) => event.type === "trapDestroyed")).toHaveLength(2);
  });
});

describe("Call of the Abyss (card)", () => {
  const withCard = (state: GameState) =>
    patch(state, "hero", {
      hand: [{ uid: "abyss", cardId: "abyssCall" }],
      energy: 10,
    });
  const play = (state: GameState, targetId: string) =>
    send(withCard(state), {
      type: "playCard",
      playerId: "hero",
      cardUid: "abyss",
      targetId,
    });

  it("pulls the opponent down into hell, to come out where they were", () => {
    const { state, events } = play(patch(duel("studySession"), "rival", { position: 30 }), "rival");
    expect(player(state, "rival")).toMatchObject({
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
    const { state, events } = play(patch(duel("studySession"), "rival", { position: 30, spectralArmour: 2 }), "rival");
    expect(player(state, "rival").position).toBe(30);
    expect(player(state).hand).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({ type: "cardBlocked", cardId: "abyssCall" }));
  });

  it("can't reach someone already in a realm", () => {
    expect(() => play(patch(duel("studySession"), "rival", { position: HEAVEN_SPRING }), "rival")).toThrow();
  });
});
