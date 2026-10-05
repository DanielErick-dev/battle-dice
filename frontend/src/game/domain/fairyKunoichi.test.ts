import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  ENCHANT_ADVANCE,
  ENCHANT_FREEZE,
  FLAME_TILES,
  FLAME_ENERGY,
  FLAME_PUSH,
  FLAME_HITS,
  FLAME_TURNS,
  abilityCycle,
  type AbilityId,
} from "./abilities";
import type { BoardDefinition } from "./board";
import { GameRuleError, type GameCommand } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { GameState, Player } from "./types";

/** Harm at 12 (a trap), 15 (a curse) and 20 (a trap), an extra turn at 30; everything else plain. */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    12: { kind: "trap", to: 8 },
    15: { kind: "curse", curse: "drain" },
    20: { kind: "trap", to: 16 },
    30: { kind: "extraTurn" },
  },
};

const duel = (ability: AbilityId) =>
  createGame(
    BOARD,
    [
      { id: "hero", name: "Hero", ability },
      { id: "rival", name: "Rival", ability: "studySession" },
    ],
    { random: seededRandom(7) },
  );
function patch(state: GameState, id: string, changes: Partial<Player>): GameState {
  return { ...state, players: state.players.map((player) => (player.id === id ? { ...player, ...changes } : player)) };
}
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
const player = (state: GameState, id: string) => state.players.find((candidate) => candidate.id === id)!;
const ready = (state: GameState, ability: AbilityId) => patch(state, "hero", { abilityCharge: abilityCycle(ability) });
const activate = (state: GameState, extra: Partial<Extract<GameCommand, { type: "activateAbility" }>> = {}) =>
  send(state, { type: "activateAbility", playerId: "hero", ...extra });
/** The rival's turn, standing on `from`, rolling `die`. */
const rivalRolls = (state: GameState, from: number, die: number) =>
  send(
    { ...patch(state, "rival", { position: from }), currentPlayerIndex: 1 },
    { type: "rollDice", playerId: "rival" },
    [die],
  );

describe("Fairy Bloom", () => {
  const bloomed = () => activate(ready(patch(duel("fairyBloom"), "hero", { position: 10 }), "fairyBloom")).state;

  it("enchants the next three harmful tiles ahead for good", () => {
    expect(bloomed().enchantedTiles).toEqual([
      { tile: 12, owner: "hero" },
      { tile: 15, owner: "hero" },
      { tile: 20, owner: "hero" },
    ]);
    expect(abilityCycle("fairyBloom")).toBe(5);
  });

  it("an opponent stopping on one is stuck in the snow, and the fairy gains charge; the trap doesn't strike", () => {
    const start = patch(patch(bloomed(), "rival", { energy: 5 }), "hero", { abilityCharge: 0 });
    const { state, events } = rivalRolls(start, 9, 3);
    expect(player(state, "rival")).toMatchObject({ position: 12, energy: 5, skipTurns: ENCHANT_FREEZE });
    expect(events.some((event) => event.type === "trapTriggered")).toBe(false);
    expect(player(state, "hero").abilityCharge).toBeGreaterThanOrEqual(1);
  });

  it("the fairy walking over her own is carried ahead too, once per walk", () => {
    const start = { ...patch(bloomed(), "hero", { position: 10, abilityCharge: 0 }), currentPlayerIndex: 0 };
    const { state, events } = send(start, { type: "rollDice", playerId: "hero" }, [4]);
    expect(player(state, "hero").position).toBe(14 + ENCHANT_ADVANCE);
    expect(events.filter((event) => event.type === "enchantmentStirred")).toHaveLength(1);
  });

  it("the fairy stopping on her own is carried ahead", () => {
    const start = { ...patch(bloomed(), "hero", { position: 9, abilityCharge: 0 }), currentPlayerIndex: 0 };
    const { state } = send(start, { type: "rollDice", playerId: "hero" }, [3]);
    expect(player(state, "hero").position).toBe(12 + ENCHANT_ADVANCE);
  });
});

describe("Ocular Awakening", () => {
  const kunoichi = () => ready(patch(duel("ocularAwakening"), "hero", { position: 20 }), "ocularAwakening");

  it("Eternal Flames: an opponent stopping on one loses energy and is thrown back; walking through is harmless", () => {
    const lit = activate(kunoichi(), { power: "flames", flameTiles: [24, 26] }).state;
    expect(lit.blackFlames.map((flame) => flame.tile)).toEqual([24, 26]);
    expect(lit.blackFlames[0].turnsLeft).toBe(FLAME_TURNS);
    const through = rivalRolls(patch(lit, "rival", { energy: 5 }), 22, 3).state;
    expect(player(through, "rival")).toMatchObject({ energy: 5, position: 25 });
    const { state } = rivalRolls(patch(lit, "rival", { energy: 5 }), 22, 2);
    expect(player(state, "rival").energy).toBe(5 - FLAME_ENERGY);
    expect(player(state, "rival").position).toBe(24 - FLAME_PUSH);
  });

  it("every scorch charges her ability by a turn", () => {
    const lit = patch(activate(kunoichi(), { power: "flames", flameTiles: [24] }).state, "hero", { abilityCharge: 0 });
    const { events } = rivalRolls(lit, 22, 2);
    expect(events).toContainEqual(expect.objectContaining({ type: "flamesScorched", charged: true }));
  });

  it("black fire smothers the tile: whatever it held does nothing while it burns", () => {
    const lit = activate(kunoichi(), { power: "flames", flameTiles: [30] }).state;
    const { state, events } = rivalRolls(patch(lit, "rival", { energy: 5 }), 28, 2);
    expect(events.some((event) => event.type === "extraTurnGranted")).toBe(false);
    expect(player(state, "rival").position).toBe(30 - FLAME_PUSH);
    // The Kunoichi on her own fire: nothing at all, not even the tile's extra turn.
    const own = send(
      { ...patch(lit, "hero", { position: 28 }), currentPlayerIndex: 0 },
      { type: "rollDice", playerId: "hero" },
      [2],
    );
    expect(player(own.state, "hero").position).toBe(30);
    expect(own.events.some((event) => event.type === "extraTurnGranted")).toBe(false);
  });

  it("can set her own tile alight", () => {
    expect(activate(kunoichi(), { power: "flames", flameTiles: [20] }).state.blackFlames).toHaveLength(1);
  });

  it("the Crimson Witch stands in black fire and on the fairy's frost unharmed", () => {
    const witch = (state: GameState) => patch(state, "rival", { ability: "levitation", energy: 5 });
    const lit = activate(kunoichi(), { power: "flames", flameTiles: [24] }).state;
    expect(player(rivalRolls(witch(lit), 22, 2).state, "rival")).toMatchObject({ energy: 5, position: 24 });
    const bloomed = activate(ready(patch(duel("fairyBloom"), "hero", { position: 10 }), "fairyBloom")).state;
    expect(player(rivalRolls(witch(bloomed), 9, 3).state, "rival")).toMatchObject({ energy: 5, position: 12 });
  });

  it(`a fire goes out after scorching ${FLAME_HITS} times`, () => {
    let state = activate(kunoichi(), { power: "flames", flameTiles: [24] }).state;
    for (let hit = 1; hit <= FLAME_HITS; hit++) {
      state = rivalRolls(state, 22, 2).state;
      expect(state.blackFlames).toHaveLength(hit < FLAME_HITS ? 1 : 0);
    }
  });

  it(`Eternal Flames reaches anywhere on the path, but not the start, the finish or more than ${FLAME_TILES}`, () => {
    expect(activate(kunoichi(), { power: "flames", flameTiles: [58] }).state.blackFlames).toHaveLength(1);
    expect(() => activate(kunoichi(), { power: "flames", flameTiles: [1] })).toThrow(GameRuleError);
    expect(() => activate(kunoichi(), { power: "flames", flameTiles: [21, 22, 23] })).toThrow(GameRuleError);
  });

  it("Spectral Armour turns away what others aim at her, but not the board's traps", () => {
    const armoured = activate(kunoichi(), { power: "armour" }).state;
    expect(player(armoured, "hero").spectralArmour).toBe(ARMOUR_TURNS);
    const rivalTurn = {
      ...patch(armoured, "rival", { position: 20, hand: [{ uid: "b", cardId: "arcaneBlast" }], energy: 5 }),
      currentPlayerIndex: 1,
    };
    expect(() => send(rivalTurn, { type: "playCard", playerId: "rival", cardUid: "b", targetId: "hero" })).toThrow(
      GameRuleError,
    );
  });
});
