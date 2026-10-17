import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  ENCHANT_FREEZE,
  FLAME_TILES,
  FLAME_ENERGY,
  FLAME_PUSH,
  FLAME_HITS,
  FLAME_TURNS,
  SUSANOO_PUSH,
  WINTER_TILES,
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

  it("an opponent stuck in the snow feeds the fairy a point of energy each round, gripped less each time", () => {
    const start = patch(patch(bloomed(), "rival", { energy: 5 }), "hero", {
      energy: 2,
    });
    let state = rivalRolls(start, 9, 3).state;
    expect(player(state, "rival").snowbound).toEqual({
      owner: "hero",
      rounds: ENCHANT_FREEZE,
    });
    state = send(state, { type: "rollDice", playerId: "hero" }).state;
    expect(player(state, "rival")).toMatchObject({
      energy: 4,
      snowbound: { owner: "hero", rounds: 1 },
    });
    expect(player(state, "hero").energy).toBeGreaterThanOrEqual(3);
    state = send(state, { type: "rollDice", playerId: "hero" }).state;
    expect(player(state, "rival")).toMatchObject({
      energy: 3,
      snowbound: null,
      skipTurns: 0,
    });
  });

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

  it("the fairy walking over her own snow isn't carried: only stopping on it counts", () => {
    // Snow at 12, 15 and 20: from 10 a 4 crosses 12 and stops on 14, and stays there.
    const start = {
      ...patch(bloomed(), "hero", { position: 10, abilityCharge: 0 }),
      currentPlayerIndex: 0,
    };
    const { state, events } = send(start, { type: "rollDice", playerId: "hero" }, [4]);
    expect(player(state, "hero").position).toBe(14);
    expect(events.some((event) => event.type === "enchantmentStirred")).toBe(false);
  });

  it("the fairy stopping on her own is carried ahead, and on again only when that stops on more snow", () => {
    // Snow at 12, 17 and 22: stops on 12, carried to 17 (snow), 22 (snow), then 27.
    const snowy = {
      ...bloomed(),
      enchantedTiles: [12, 17, 22].map((tile) => ({ tile, owner: "hero" })),
    };
    const start = {
      ...patch(snowy, "hero", { position: 9, abilityCharge: 0 }),
      currentPlayerIndex: 0,
    };
    const { state, events } = send(start, { type: "rollDice", playerId: "hero" }, [3]);
    expect(player(state, "hero").position).toBe(27);
    expect(events.filter((event) => event.type === "enchantmentStirred")).toHaveLength(3);
    // Carried onto the trap at 20 (snow only at 12 and 15): nothing happens there.
    const trapped = {
      ...bloomed(),
      enchantedTiles: [{ tile: 15, owner: "hero" }],
    };
    const onTrap = send(
      { ...patch(trapped, "hero", { position: 13 }), currentPlayerIndex: 0 },
      { type: "rollDice", playerId: "hero" },
      [2],
    );
    expect(player(onTrap.state, "hero").position).toBe(20);
  });
});

describe("Ocular Awakening", () => {
  const kunoichi = () => ready(patch(duel("ocularAwakening"), "hero", { position: 20 }), "ocularAwakening");

  it("burns the fairy's snow away for good: fire beats frost", () => {
    const snowy = {
      ...kunoichi(),
      enchantedTiles: [{ tile: 24, owner: "rival" }],
    };
    expect(activate(snowy, { power: "flames", flameTiles: [24] }).state.enchantedTiles).toEqual([]);
  });

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
    const { state, events } = send(rivalTurn, {
      type: "playCard",
      playerId: "rival",
      cardUid: "b",
      targetId: "hero",
    });
    expect(events).toContainEqual(expect.objectContaining({ type: "cardBlocked", ward: "susanoo" }));
    expect(player(state, "hero").position).toBe(player(armoured, "hero").position);
  });
  it(`Inside her Susanoo no one stops on her tile: they're thrown back ${SUSANOO_PUSH}`, () => {
    const armoured = activate(kunoichi(), { power: "armour" }).state;
    const { state, events } = rivalRolls(armoured, 17, 3);
    expect(events).toContainEqual({
      type: "susanooRepelled",
      playerId: "rival",
      by: "hero",
      tile: 20,
      to: 20 - SUSANOO_PUSH,
      ahead: false,
    });
    expect(player(state, "rival").position).toBe(20 - SUSANOO_PUSH);
    // Walking past her is fine, and without her armour her tile is anyone's.
    expect(player(rivalRolls(armoured, 17, 4).state, "rival").position).toBe(21);
    const bare = patch(armoured, "hero", { spectralArmour: 0 });
    expect(rivalRolls(bare, 17, 3).events.some((event) => event.type === "susanooRepelled")).toBe(false);
  });

  it(`Inside her Susanoo she sweeps those on the tile she stops on ${SUSANOO_PUSH} ahead`, () => {
    const armoured = patch(activate(kunoichi(), { power: "armour" }).state, "rival", { position: 23 });
    const { state, events } = send(armoured, { type: "rollDice", playerId: "hero" }, [3]);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "susanooRepelled",
        playerId: "rival",
        tile: 23,
        to: 23 + SUSANOO_PUSH,
        ahead: true,
      }),
    );
    expect(player(state, "rival").position).toBe(23 + SUSANOO_PUSH);
    expect(player(state, "hero").position).toBe(23);
  });
});

describe("Eternal Winter", () => {
  const bloomed = () => activate(ready(patch(duel("fairyBloom"), "hero", { position: 10 }), "fairyBloom"));
  const winter = (state: GameState, frontier: number) => ({
    ...state,
    winter: { owner: "hero", frontier },
  });

  it("sets in once no harm is left ahead of the fairy", () => {
    const { state, events } = bloomed();
    expect(state.winter).toEqual({
      owner: "hero",
      frontier: state.board.startTile,
    });
    expect(events).toContainEqual({ type: "winterBegan", playerId: "hero" });
  });

  it("waits while there's still harm ahead to snow", () => {
    // A hidden trap further on is still left once her three tiles are snowed.
    const hidden = {
      ...patch(duel("fairyBloom"), "hero", { position: 10 }),
      hiddenTraps: [40],
    };
    const { state } = activate(ready(hidden, "fairyBloom"));
    expect(state.winter).toBeNull();
  });

  it("freezes WINTER_TILES more tiles every round", () => {
    const afterHero = send(bloomed().state, { type: "rollDice", playerId: "hero" }, [1]).state;
    expect(afterHero.winter?.frontier).toBe(afterHero.board.startTile);
    const { state, events } = send(
      patch(afterHero, "rival", { position: 40 }),
      { type: "rollDice", playerId: "rival" },
      [1],
    );
    const start = state.board.startTile;
    expect(state.winter?.frontier).toBe(start + WINTER_TILES);
    expect(events).toContainEqual({
      type: "winterSpread",
      owner: "hero",
      from: start + 1,
      to: start + WINTER_TILES,
    });
  });

  it("an opponent stopping on the ice is stuck in it; the fairy walks it freely", () => {
    const frozen = winter(duel("fairyBloom"), 40);
    const rival = rivalRolls(frozen, 3, 2).state;
    expect(player(rival, "rival")).toMatchObject({
      skipTurns: ENCHANT_FREEZE,
      snowbound: { owner: "hero" },
    });
    const hero = send(patch(frozen, "hero", { position: 3 }), { type: "rollDice", playerId: "hero" }, [2]).state;
    expect(player(hero, "hero")).toMatchObject({ position: 5, skipTurns: 0 });
  });
});
