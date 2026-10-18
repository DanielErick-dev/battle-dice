import { describe, expect, it } from "vitest";
import {
  BLOOD_PACT_ENERGY,
  RUIN_PUSH,
  SEAL_RANGE,
  SOLO_PACT_ENERGY,
  SOLO_RUIN_ADVANCE,
  abilityCycle,
} from "./abilities";
import type { BoardDefinition } from "./board";
import { sealableTiles } from "./seals";
import {
  activate,
  card,
  expectRuleError,
  newGame,
  onTurnOf,
  play,
  playerOf,
  readyAbility,
  roll,
  withPlayer,
  withPlayers,
} from "./testing";
import type { GameState, Player, Seal } from "./types";

const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 } } };

const duel = () => newGame(BOARD, { scribe: "forbiddenSeals", rival: "studySession" });
const solo = () => newGame(BOARD, { scribe: "forbiddenSeals" });
const readyScribe = (state: GameState) => readyAbility(state, "scribe");
const write = (state: GameState, sealTiles: number[]) => activate(state, "scribe", { sealTiles });
/** The rival's turn, standing on `from`, with the scribe's `seals` on the board. */
const rivalTurn = (state: GameState, from: number, seals: Seal[]): GameState => ({
  ...onTurnOf(withPlayer(state, "rival", { position: from }), "rival"),
  seals,
});
const seal = (tile: number, kind: Seal["kind"], owner = "scribe"): Seal => ({ tile, kind, owner });

describe("Forbidden Seals", () => {
  it("writes one seal of each kind on the picked tiles, in order, keeping the ones written before", () => {
    const start = readyScribe(withPlayer(duel(), "scribe", { position: 20 }));
    const { state, events } = write({ ...start, seals: [seal(30, "ruin")] }, [22, 25, 17, 28]);
    expect(state.seals).toEqual([
      seal(30, "ruin"),
      seal(22, "tithe"),
      seal(25, "ruin"),
      seal(17, "silence"),
      seal(28, "bloodPact"),
    ]);
    expect(events).toContainEqual({ type: "sealsWritten", playerId: "scribe", tiles: [22, 25, 17, 28] });
    expect(playerOf(state, "scribe").abilityCharge).toBe(0);
  });

  it("charges over the long cycle", () => {
    expect(abilityCycle("forbiddenSeals")).toBe(5);
  });

  it("only writes on plain main-path tiles within range, never on an effect or another seal", () => {
    const tiles = sealableTiles(newGame(BOARD, { a: null }).board, 10, [15]);
    expect(tiles).toContain(10);
    expect(tiles).not.toContain(12);
    expect(tiles).not.toContain(15);
    expect(tiles).toContain(10 + SEAL_RANGE);
    expect(tiles).not.toContain(10 + SEAL_RANGE + 1);
    expect(tiles).toContain(2);
    expect(tiles).not.toContain(1);

    const start = readyScribe(withPlayer(duel(), "scribe", { position: 20 }));
    expectRuleError(() => write(start, [22, 25, 17]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 22, 17, 28]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 25, 17, 20 + SEAL_RANGE + 1]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 25, 17, 12]), "INVALID_SEALS");
    expectRuleError(() => write({ ...start, seals: [seal(22, "ruin", "rival")] }, [22, 25, 17, 28]), "INVALID_SEALS");
    expectRuleError(() => write({ ...start, seals: [seal(22, "ruin")] }, [22, 25, 17, 28]), "INVALID_SEALS");
  });

  it("Tithe: the opponent who stops on it hands over their most valuable card", () => {
    const start = rivalTurn(withPlayer(duel(), "rival", { hand: [card("windStep", "a"), card("fateRune", "b")] }), 20, [
      seal(21, "tithe"),
    ]);
    const { state, events } = roll(start, "rival", 1);
    expect(playerOf(state, "rival").hand).toEqual([card("windStep", "a")]);
    expect(playerOf(state, "scribe").hand).toContainEqual(card("fateRune", "b"));
    expect(events).toContainEqual(expect.objectContaining({ type: "sealBroken", playerId: "rival", kind: "tithe" }));
    expect(state.seals).toEqual([]);
  });

  it(`Ruin: the opponent is thrown back ${RUIN_PUSH} tiles`, () => {
    const { state } = roll(rivalTurn(duel(), 20, [seal(23, "ruin")]), "rival", 3);
    expect(playerOf(state, "rival").position).toBe(23 - RUIN_PUSH);
  });

  it("Silence: no cards for the rest of that turn and the whole next one", () => {
    const struck = roll(rivalTurn(duel(), 20, [seal(21, "silence")]), "rival", 1).state;
    expect(playerOf(struck, "rival").silencedTurns).toBeGreaterThan(0);
    // The scribe's turn passes, then the rival's next turn starts still silenced...
    const next = roll(struck, "scribe", 1).state;
    const rival = playerOf(next, "rival");
    const silenced = withPlayer(next, "rival", { energy: 5, hand: [card("healingHerb", "h")] });
    expect(rival.silencedTurns).toBe(1);
    expectRuleError(() => play(silenced, "rival", "h"), "SILENCED");
    // ...and the one after is free again.
    const later = roll(roll(next, "rival", 1).state, "scribe", 1).state;
    expect(playerOf(later, "rival").silencedTurns).toBe(0);
  });

  it("Blood Pact: energy goes from the opponent to the scribe", () => {
    const start = withPlayers(rivalTurn(duel(), 20, [seal(21, "bloodPact")]), {
      rival: { energy: 3 },
      scribe: { energy: 1 },
    });
    const { state } = roll(start, "rival", 1);
    expect(playerOf(state, "rival").energy).toBe(3 - BLOOD_PACT_ENERGY);
    expect(playerOf(state, "scribe").energy).toBe(1 + BLOOD_PACT_ENERGY);
  });

  it("does nothing to its own writer while there are opponents, and stays", () => {
    const start = { ...withPlayer(duel(), "scribe", { position: 20 }), seals: [seal(21, "ruin")] };
    const { state } = roll(start, "scribe", 1);
    expect(playerOf(state, "scribe").position).toBe(21);
    expect(state.seals).toEqual([seal(21, "ruin")]);
  });

  describe("alone on the board, the writer's own seals reward them", () => {
    const step = (kind: Seal["kind"], changes: Partial<Player> = {}) =>
      roll({ ...withPlayer(solo(), "scribe", { position: 20, ...changes }), seals: [seal(21, kind)] }, "scribe", 1);

    it("Tithe draws a card, Ruin carries them ahead", () => {
      const tithe = step("tithe", { hand: [] });
      expect(playerOf(tithe.state, "scribe").hand).toHaveLength(1);
      expect(playerOf(step("ruin").state, "scribe").position).toBe(21 + SOLO_RUIN_ADVANCE);
    });

    it("Silence and the Pact give energy", () => {
      expect(playerOf(step("bloodPact", { energy: 0 }).state, "scribe").energy).toBeGreaterThanOrEqual(
        SOLO_PACT_ENERGY,
      );
      expect(playerOf(step("silence", { energy: 0 }).state, "scribe").energy).toBeGreaterThanOrEqual(1);
      expect(step("silence").state.seals).toEqual([]);
    });
  });
});
