import { describe, expect, it } from "vitest";
import { abilityCycle, PLUNDER_CARDS } from "./abilities";
import type { BoardDefinition } from "./board";
import { MAX_ENERGY } from "./cards";
import {
  card,
  expectRuleError,
  hasEvent,
  newGame,
  onTurnOf,
  playerOf,
  roll,
  send,
  withPlayer,
  withPlayers,
} from "./testing";
import type { GameState, Player, Specter } from "./types";

const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 } } };

const duel = () => newGame(BOARD, { warden: "spectralApparitions", rival: null });
const solo = () => newGame(BOARD, { warden: "spectralApparitions" });
const specter = (tile: number, kind: Specter["kind"], owner = "warden"): Specter => ({ tile, kind, owner });
/** The rival's turn, standing on `from`, with the warden on `wardenAt` and `specters` on the board. */
const rivalWalks = (from: number, specters: Specter[], die: number, wardenAt = 2, changes: Partial<Player> = {}) =>
  roll(
    {
      ...onTurnOf(
        withPlayers(duel(), { rival: { position: from, ...changes }, warden: { position: wardenAt } }),
        "rival",
      ),
      specters,
    },
    "rival",
    die,
  );

describe("Spectral Apparitions", () => {
  const summon = (state: GameState, specterTiles: number[]) =>
    send(state, { type: "activateAbility", playerId: "warden", specterTiles });
  const ready = (state: GameState) =>
    withPlayer(state, "warden", { position: 20, abilityCharge: abilityCycle("spectralApparitions") });

  it("summons the Plunder and Hunger apparitions on the picked tiles, keeping the ones summoned before", () => {
    const { state, events } = summon({ ...ready(duel()), specters: [specter(30, "hunger")] }, [24, 17]);
    expect(state.specters).toEqual([specter(30, "hunger"), specter(24, "plunder"), specter(17, "hunger")]);
    expect(events).toContainEqual({ type: "spectersSummoned", playerId: "warden", tiles: [24, 17] });
    expect(abilityCycle("spectralApparitions")).toBe(5);
  });

  it("only appears on plain tiles in range, never on a seal or another apparition", () => {
    const start = ready(duel());
    expectRuleError(() => summon({ ...start, specters: [specter(24, "hunger")] }, [24, 17]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 24]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 12]), "INVALID_SPECTERS");
    expectRuleError(() => summon(start, [24, 55]), "INVALID_SPECTERS");
    expectRuleError(
      () => summon({ ...start, seals: [{ tile: 24, kind: "ruin", owner: "rival" }] }, [24, 17]),
      "INVALID_SPECTERS",
    );
  });

  it("Plunder: whoever walks through it waits while the warden picks two of their cards", () => {
    const hand = [card("windStep", "a"), card("fateRune", "b"), card("healingHerb", "c")];
    const { state, events } = rivalWalks(20, [specter(22, "plunder")], 4, 2, { hand });
    expect(events).toContainEqual(expect.objectContaining({ type: "specterStruck", kind: "plunder", tile: 22 }));
    expect(state.pendingPlunder).toMatchObject({ owner: "warden", victim: "rival" });
    expect(state.specters).toEqual([]);
    expectRuleError(() => roll(state, "rival"), "PLUNDER_PENDING");
    expectRuleError(() => send(state, { type: "plunderCards", playerId: "warden", cardUids: ["a"] }), "UNKNOWN_CARD");

    const picked = send(state, { type: "plunderCards", playerId: "warden", cardUids: ["b", "c"] }).state;
    expect(playerOf(picked, "rival").hand).toEqual([card("windStep", "a")]);
    expect(playerOf(picked, "warden").hand).toEqual(expect.arrayContaining([hand[1], hand[2]]));
    expect(picked.pendingPlunder).toBeNull();
    // The rival's roll ended their turn once the plunder was settled.
    expect(picked.players[picked.currentPlayerIndex].id).toBe("warden");
    expect(PLUNDER_CARDS).toBe(2);
  });

  it("Hunger: all their energy goes to the warden; what doesn't fit charges the ability", () => {
    const start = rivalWalks(20, [specter(21, "hunger")], 1, 2, { energy: 4 });
    expect(playerOf(start.state, "rival").energy).toBe(0);
    const before = playerOf(duel(), "warden");
    expect(playerOf(start.state, "warden").energy).toBe(Math.min(MAX_ENERGY, before.energy + 4));
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
    expect(hasEvent(events, "specterStruck")).toBe(false);
  });

  it("does nothing to the warden while there are opponents", () => {
    const start = { ...withPlayer(duel(), "warden", { position: 20 }), specters: [specter(21, "hunger")] };
    const { state } = roll(start, "warden", 1);
    expect(state.specters).toEqual([specter(21, "hunger")]);
  });

  it("alone, walking through them rewards the warden", () => {
    const walk = (kind: Specter["kind"], changes: Partial<Player> = {}) =>
      roll(
        { ...withPlayer(solo(), "warden", { position: 20, ...changes }), specters: [specter(21, kind)] },
        "warden",
        2,
      ).state;
    expect(playerOf(walk("plunder", { hand: [] }), "warden").hand).toHaveLength(PLUNDER_CARDS);
    expect(playerOf(walk("hunger", { energy: 0 }), "warden").energy).toBe(MAX_ENERGY);
  });
});
