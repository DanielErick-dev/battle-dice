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
import { GameRuleError, type GameCommand, type GameErrorCode } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import { sealableTiles } from "./seals";
import type { CardInstance, GameState, Player, Seal } from "./types";

const BOARD: BoardDefinition = { size: 60, effects: { 12: { kind: "trap", to: 8 } } };

const duel = () =>
  createGame(
    BOARD,
    [
      { id: "scribe", name: "Escriba", ability: "forbiddenSeals" },
      { id: "rival", name: "Rival", ability: "studySession" },
    ],
    { random: seededRandom(7) },
  );
const solo = () =>
  createGame(BOARD, [{ id: "scribe", name: "Escriba", ability: "forbiddenSeals" }], { random: seededRandom(7) });

function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)) };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;
const readyScribe = (state: GameState) => patch(state, "scribe", { abilityCharge: abilityCycle("forbiddenSeals") });
const write = (state: GameState, sealTiles: number[]) =>
  send(state, { type: "activateAbility", playerId: "scribe", sealTiles });
/** The rival's turn, standing on `from`, with the scribe's `seals` on the board. */
const rivalTurn = (state: GameState, from: number, seals: Seal[]): GameState => ({
  ...patch(state, "rival", { position: from }),
  currentPlayerIndex: 1,
  seals,
});
const seal = (tile: number, kind: Seal["kind"], owner = "scribe"): Seal => ({ tile, kind, owner });
const card = (uid: string, cardId: CardInstance["cardId"]): CardInstance => ({ uid, cardId });

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

describe("Forbidden Seals", () => {
  it("writes one seal of each kind on the picked tiles, in order, keeping the ones written before", () => {
    const start = readyScribe(patch(duel(), "scribe", { position: 20 }));
    const { state, events } = write({ ...start, seals: [seal(30, "ruin")] }, [22, 25, 17, 28]);
    expect(state.seals).toEqual([
      seal(30, "ruin"),
      seal(22, "tithe"),
      seal(25, "ruin"),
      seal(17, "silence"),
      seal(28, "bloodPact"),
    ]);
    expect(events).toContainEqual({ type: "sealsWritten", playerId: "scribe", tiles: [22, 25, 17, 28] });
    expect(player(state, "scribe").abilityCharge).toBe(0);
  });

  it("charges over the long cycle", () => {
    expect(abilityCycle("forbiddenSeals")).toBe(5);
  });

  it("only writes on plain main-path tiles within range, never on an effect or another seal", () => {
    const tiles = sealableTiles(createGame(BOARD, [{ id: "a", name: "A" }]).board, 10, [15]);
    expect(tiles).not.toContain(10);
    expect(tiles).not.toContain(12);
    expect(tiles).not.toContain(15);
    expect(tiles).toContain(10 + SEAL_RANGE);
    expect(tiles).not.toContain(10 + SEAL_RANGE + 1);
    expect(tiles).toContain(2);
    expect(tiles).not.toContain(1);

    const start = readyScribe(patch(duel(), "scribe", { position: 20 }));
    expectRuleError(() => write(start, [22, 25, 17]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 22, 17, 28]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 25, 17, 40]), "INVALID_SEALS");
    expectRuleError(() => write(start, [22, 25, 17, 12]), "INVALID_SEALS");
    expectRuleError(() => write({ ...start, seals: [seal(22, "ruin", "rival")] }, [22, 25, 17, 28]), "INVALID_SEALS");
    expectRuleError(() => write({ ...start, seals: [seal(22, "ruin")] }, [22, 25, 17, 28]), "INVALID_SEALS");
  });

  it("Tithe: the opponent who stops on it hands over their most valuable card", () => {
    const start = rivalTurn(patch(duel(), "rival", { hand: [card("a", "windStep"), card("b", "fateRune")] }), 20, [
      seal(21, "tithe"),
    ]);
    const { state, events } = send(start, { type: "rollDice", playerId: "rival" }, [1]);
    expect(player(state, "rival").hand).toEqual([card("a", "windStep")]);
    expect(player(state, "scribe").hand).toContainEqual(card("b", "fateRune"));
    expect(events).toContainEqual(expect.objectContaining({ type: "sealBroken", playerId: "rival", kind: "tithe" }));
    expect(state.seals).toEqual([]);
  });

  it(`Ruin: the opponent is thrown back ${RUIN_PUSH} tiles`, () => {
    const { state } = send(rivalTurn(duel(), 20, [seal(23, "ruin")]), { type: "rollDice", playerId: "rival" }, [3]);
    expect(player(state, "rival").position).toBe(23 - RUIN_PUSH);
  });

  it("Silence: no cards for the rest of that turn and the whole next one", () => {
    const struck = send(
      rivalTurn(duel(), 20, [seal(21, "silence")]),
      { type: "rollDice", playerId: "rival" },
      [1],
    ).state;
    expect(player(struck, "rival").silencedTurns).toBeGreaterThan(0);
    // The scribe's turn passes, then the rival's next turn starts still silenced...
    const next = send(struck, { type: "rollDice", playerId: "scribe" }, [1]).state;
    const rival = player(next, "rival");
    const silenced = patch(next, "rival", { energy: 5, hand: [card("h", "healingHerb")] });
    expect(rival.silencedTurns).toBe(1);
    expectRuleError(() => send(silenced, { type: "playCard", playerId: "rival", cardUid: "h" }), "SILENCED");
    // ...and the one after is free again.
    const later = send(
      send(next, { type: "rollDice", playerId: "rival" }, [1]).state,
      { type: "rollDice", playerId: "scribe" },
      [1],
    ).state;
    expect(player(later, "rival").silencedTurns).toBe(0);
  });

  it("Blood Pact: energy goes from the opponent to the scribe", () => {
    const start = patch(patch(rivalTurn(duel(), 20, [seal(21, "bloodPact")]), "rival", { energy: 3 }), "scribe", {
      energy: 1,
    });
    const { state } = send(start, { type: "rollDice", playerId: "rival" }, [1]);
    expect(player(state, "rival").energy).toBe(3 - BLOOD_PACT_ENERGY);
    expect(player(state, "scribe").energy).toBe(1 + BLOOD_PACT_ENERGY + 1); // + their turn's energy
  });

  it("does nothing to its own writer while there are opponents, and stays", () => {
    const start = { ...patch(duel(), "scribe", { position: 20 }), seals: [seal(21, "ruin")] };
    const { state } = send(start, { type: "rollDice", playerId: "scribe" }, [1]);
    expect(player(state, "scribe").position).toBe(21);
    expect(state.seals).toEqual([seal(21, "ruin")]);
  });

  describe("alone on the board, the writer's own seals reward them", () => {
    const step = (kind: Seal["kind"], changes: Partial<Player> = {}) =>
      send(
        { ...patch(solo(), "scribe", { position: 20, ...changes }), seals: [seal(21, kind)] },
        { type: "rollDice", playerId: "scribe" },
        [1],
      );

    it("Tithe draws a card, Ruin carries them ahead", () => {
      const tithe = step("tithe", { hand: [] });
      expect(player(tithe.state, "scribe").hand).toHaveLength(1);
      expect(player(step("ruin").state, "scribe").position).toBe(21 + SOLO_RUIN_ADVANCE);
    });

    it("Silence and the Pact give energy", () => {
      expect(player(step("bloodPact", { energy: 0 }).state, "scribe").energy).toBeGreaterThanOrEqual(SOLO_PACT_ENERGY);
      expect(player(step("silence", { energy: 0 }).state, "scribe").energy).toBeGreaterThanOrEqual(1);
      expect(step("silence").state.seals).toEqual([]);
    });
  });
});
