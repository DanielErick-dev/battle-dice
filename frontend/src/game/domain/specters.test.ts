import { describe, expect, it } from "vitest";
import { abilityCycle, PLUNDER_CARDS } from "./abilities";
import type { BoardDefinition } from "./board";
import { MAX_ENERGY } from "./cards";
import { GameRuleError, type GameCommand, type GameErrorCode } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { CardInstance, GameState, Player, Specter } from "./types";

const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 } } };

const duel = () =>
  createGame(
    BOARD,
    [
      { id: "warden", name: "Guardião", ability: "spectralApparitions" },
      { id: "rival", name: "Rival" },
    ],
    { random: seededRandom(7) },
  );
const solo = () =>
  createGame(BOARD, [{ id: "warden", name: "Guardião", ability: "spectralApparitions" }], { random: seededRandom(7) });

function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)) };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;
const specter = (tile: number, kind: Specter["kind"], owner = "warden"): Specter => ({ tile, kind, owner });
const card = (uid: string, cardId: CardInstance["cardId"]): CardInstance => ({ uid, cardId });
/** The rival's turn, standing on `from`, with the warden on `wardenAt` and `specters` on the board. */
const rivalWalks = (from: number, specters: Specter[], dice: number, wardenAt = 2, changes: Partial<Player> = {}) =>
  send(
    {
      ...patch(patch(duel(), "rival", { position: from, ...changes }), "warden", { position: wardenAt }),
      currentPlayerIndex: 1,
      specters,
    },
    { type: "rollDice", playerId: "rival" },
    [dice],
  );

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

describe("Spectral Apparitions", () => {
  const summon = (state: GameState, specterTiles: number[]) =>
    send(state, { type: "activateAbility", playerId: "warden", specterTiles });
  const ready = (state: GameState) =>
    patch(state, "warden", { position: 20, abilityCharge: abilityCycle("spectralApparitions") });

  it("summons the Plunder and Hunger apparitions on the picked tiles, wiping the old ones", () => {
    const { state, events } = summon({ ...ready(duel()), specters: [specter(30, "hunger")] }, [24, 17]);
    expect(state.specters).toEqual([specter(24, "plunder"), specter(17, "hunger")]);
    expect(events).toContainEqual({ type: "spectersSummoned", playerId: "warden", tiles: [24, 17] });
    expect(abilityCycle("spectralApparitions")).toBe(5);
  });

  it("only appears on plain tiles in range, never on a seal", () => {
    const start = ready(duel());
    expectRuleError(() => summon(start, [24]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 24]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 12]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 40]), "INVALID_SPECTERS");
    expectRuleError(
      () => summon({ ...start, seals: [{ tile: 24, kind: "ruin", owner: "rival" }] }, [24, 17]),
      "INVALID_SPECTERS",
    );
  });

  it("Plunder: whoever walks through it waits while the warden picks two of their cards", () => {
    const hand = [card("a", "windStep"), card("b", "fateRune"), card("c", "healingHerb")];
    const { state, events } = rivalWalks(20, [specter(22, "plunder")], 4, 2, { hand });
    expect(events).toContainEqual(expect.objectContaining({ type: "specterStruck", kind: "plunder", tile: 22 }));
    expect(state.pendingPlunder).toMatchObject({ owner: "warden", victim: "rival" });
    expect(state.specters).toEqual([]);
    expectRuleError(() => send(state, { type: "rollDice", playerId: "rival" }), "PLUNDER_PENDING");
    expectRuleError(() => send(state, { type: "plunderCards", playerId: "warden", cardUids: ["a"] }), "UNKNOWN_CARD");

    const picked = send(state, { type: "plunderCards", playerId: "warden", cardUids: ["b", "c"] }).state;
    expect(player(picked, "rival").hand).toEqual([card("a", "windStep")]);
    expect(player(picked, "warden").hand).toEqual(expect.arrayContaining([hand[1], hand[2]]));
    expect(picked.pendingPlunder).toBeNull();
    // The rival's roll ended their turn once the plunder was settled.
    expect(picked.players[picked.currentPlayerIndex].id).toBe("warden");
    expect(PLUNDER_CARDS).toBe(2);
  });

  it("Hunger: all their energy goes to the warden; what doesn't fit charges the ability", () => {
    const start = rivalWalks(20, [specter(21, "hunger")], 1, 2, { energy: 4 });
    expect(player(start.state, "rival").energy).toBe(0);
    const before = player(duel(), "warden");
    expect(player(start.state, "warden").energy).toBe(Math.min(MAX_ENERGY, before.energy + 4));
    const overflow = before.energy + 4 - MAX_ENERGY;
    expect(start.events).toContainEqual(
      expect.objectContaining({
        type: "specterStruck",
        kind: "hunger",
        energyTaken: 4,
        chargeGained: overflow > 0 ? 1 : 0,
      }),
    );
  });

  it("walking through the warden first dispels their apparitions", () => {
    const { state, events } = rivalWalks(20, [specter(24, "plunder"), specter(25, "hunger")], 6, 22);
    expect(state.specters).toEqual([]);
    expect(events).toContainEqual({ type: "spectersDispelled", playerId: "rival", owner: "warden", tiles: [24, 25] });
    expect(events.some((event) => event.type === "specterStruck")).toBe(false);
  });

  it("does nothing to the warden while there are opponents", () => {
    const start = { ...patch(duel(), "warden", { position: 20 }), specters: [specter(21, "hunger")] };
    const { state } = send(start, { type: "rollDice", playerId: "warden" }, [1]);
    expect(state.specters).toEqual([specter(21, "hunger")]);
  });

  it("alone, walking through them rewards the warden", () => {
    const walk = (kind: Specter["kind"], changes: Partial<Player> = {}) =>
      send(
        { ...patch(solo(), "warden", { position: 20, ...changes }), specters: [specter(21, kind)] },
        { type: "rollDice", playerId: "warden" },
        [2],
      ).state;
    expect(player(walk("plunder", { hand: [] }), "warden").hand).toHaveLength(PLUNDER_CARDS);
    expect(player(walk("hunger", { energy: 0 }), "warden").energy).toBe(MAX_ENERGY);
  });
});
