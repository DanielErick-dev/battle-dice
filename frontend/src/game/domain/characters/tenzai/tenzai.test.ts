import { describe, expect, it } from "vitest";
import { abilityCycle, LONG_ABILITY_CYCLE } from "../../abilities/charge";
import { projectState, projectEvents } from "../../core/projection";
import type { BoardDefinition } from "../../board/board";
import type { GameState } from "../../core/state";
import {
  activate,
  card,
  eventsOfType,
  expectRuleError,
  newGame,
  onTurnOf,
  play,
  playerOf,
  readyAbility,
  roll,
  withPlayer,
  withPlayers,
} from "../../testing";
import {
  BREEZE_THRESHOLD,
  COMBUSTION_PUSH,
  CONVERGENCE_BONUS,
  CONVERGENCE_TURNS,
  MAX_WALLS,
  TETHER_TURNS,
  WALL_HP,
} from "./elements";
import { FORCED_TAILWIND_BONUS, FORTIFY_NEW_HP } from "./cards";
import type { ActivateOptions } from "../../testing";
import type { TenzaiState } from "./types";

const BOARD: BoardDefinition = { size: 120, effects: {} };

const duel = () => newGame(BOARD, { tenzai: "fourElements", rival: "doubleCast" });
const bend = (state: GameState, options: ActivateOptions, dice = [1]) =>
  activate(readyAbility(state, "tenzai"), "tenzai", options, dice);
/** Tenzai at 10, the rival at 20. */
const placed = (start = duel()) => withPlayers(start, { tenzai: { position: 10 }, rival: { position: 20 } });
const rivalRolls = (state: GameState, die: number) => roll(onTurnOf(state, "rival"), "rival", die);
const withTenzai = (state: GameState, patch: Partial<TenzaiState>) =>
  withPlayer(state, "tenzai", { tenzai: { ...playerOf(state, "tenzai").tenzai, ...patch } });
const withHand = (state: GameState, ...cardIds: Parameters<typeof card>[0][]) =>
  withPlayer(state, "tenzai", { hand: cardIds.map((id) => card(id)), energy: 10 });

describe("Mastery of the Four Elements", () => {
  it(`charges in ${LONG_ABILITY_CYCLE} turns and never bends the same element twice in a row`, () => {
    expect(abilityCycle("fourElements")).toBe(LONG_ABILITY_CYCLE);
    const { state } = bend(placed(), { element: "fire" });
    expect(playerOf(state, "tenzai").tenzai.lastElement).toBe("fire");
    expectRuleError(() => bend(state, { element: "fire" }), "ELEMENT_LOCKED");
    expect(() => bend(state, { element: "wind" })).not.toThrow();
  });
});

describe("Tectonic Wall", () => {
  it("eats what's left of a walk up to its hp: a short roll stops behind it and chips it", () => {
    let state = bend(placed(), { element: "earth", wallTile: 23 }).state;
    const hit = rivalRolls(state, 5);
    expect(playerOf(hit.state, "rival").position).toBe(22);
    expect(eventsOfType(hit.events, "wallHit")).toEqual([
      { type: "wallHit", playerId: "rival", tile: 23, damage: 3, hp: WALL_HP - 3 },
    ]);
    state = rivalRolls(onTurnOf(hit.state, "rival"), WALL_HP - 3).state;
    expect(state.elementals.walls).toEqual([]);
    expect(playerOf(state, "rival").position).toBe(22);
  });

  it("crumbles under a long roll, which spends its hp and walks on past it", () => {
    const state = withPlayers(bend(placed(), { element: "earth", wallTile: 23 }).state, {
      rival: { position: 21 },
    });
    const weakened = {
      ...state,
      elementals: { ...state.elementals, walls: [{ ...state.elementals.walls[0]!, hp: 4 }] },
    };
    const { state: after, events } = rivalRolls(weakened, 6);
    expect(eventsOfType(events, "wallCrumbled")).toHaveLength(1);
    // 6 from 21: one step to reach it, 4 spent on it, one onto the tile it stood on.
    expect(playerOf(after, "rival").position).toBe(23);
    const far = rivalRolls(weakened, 12);
    expect(playerOf(far.state, "rival").position).toBe(21 + 12 - 4);
  });

  it("lets its owner walk through", () => {
    const { state } = bend(placed(), { element: "earth", wallTile: 12 });
    expect(playerOf(roll(state, "tenzai", 4).state, "tenzai").position).toBe(14);
  });

  it(`only rises on a free plain tile near someone, and his oldest crumbles past ${MAX_WALLS}`, () => {
    expectRuleError(() => bend(placed(), { element: "earth", wallTile: 20 }), "INVALID_WALL");
    expectRuleError(() => bend(placed(), { element: "earth", wallTile: 60 }), "INVALID_WALL");
    let state = placed();
    for (const tile of [21, 22, 23])
      state = bend(withTenzai(state, { lastElement: null }), { element: "earth", wallTile: tile }).state;
    expect(state.elementals.walls.map((wall) => wall.tile)).toEqual([22, 23]);
  });
});

describe("Current Bond", () => {
  it("pulls him half of every walk of the target's, rounded down, for its rounds", () => {
    const { state } = bend(placed(), { element: "water", targetId: "rival" });
    expect(state.elementals.tethers).toEqual([
      { owner: "tenzai", target: "rival", turnsLeft: TETHER_TURNS + 1, share: 0.5 },
    ]);
    const pulled = rivalRolls(state, 5);
    expect(playerOf(pulled.state, "tenzai").position).toBe(12);
    expect(eventsOfType(pulled.events, "tetherPulled")).toHaveLength(1);
  });

  it("is turned away by a protected target", () => {
    const { state, events } = bend(withPlayer(placed(), "rival", { spectralArmour: 2 }), {
      element: "water",
      targetId: "rival",
    });
    expect(state.elementals.tethers).toEqual([]);
    expect(eventsOfType(events, "abilityBlocked")).toHaveLength(1);
  });

  it("snaps once his rounds are over", () => {
    let state = bend(placed(), { element: "water", targetId: "rival" }).state;
    for (let round = 0; round <= TETHER_TURNS; round++) state = rivalRolls(roll(state, "tenzai", 1).state, 1).state;
    expect(state.elementals.tethers).toEqual([]);
  });
});

describe("Combustion Die", () => {
  it("on a 5 or 6 doubles the walk, throws back whoever is close and rolls again", () => {
    const start = withPlayers(placed(), { rival: { position: 21 } });
    const { state } = bend(start, { element: "fire" });
    const blast = roll(state, "tenzai", 5);
    expect(playerOf(blast.state, "tenzai").position).toBe(20);
    expect(playerOf(blast.state, "rival").position).toBe(21 - COMBUSTION_PUSH);
    expect(eventsOfType(blast.events, "combustionExploded")).toHaveLength(1);
    expect(blast.state.players[blast.state.currentPlayerIndex]?.id).toBe("tenzai");
  });

  it("does nothing on a lower face, and is spent by the roll either way", () => {
    const { state } = bend(placed(), { element: "fire" });
    const calm = roll(state, "tenzai", 4);
    expect(playerOf(calm.state, "tenzai")).toMatchObject({ position: 14, tenzai: { combustion: null } });
  });
});

describe("Breeze Heist", () => {
  it(`steals an opponent's roll of ${BREEZE_THRESHOLD} or more: they stay, he walks it`, () => {
    const armed = bend(placed(), { element: "wind" }).state;
    expect(rivalRolls(armed, 5).state.elementals.breezes).toHaveLength(1);
    const stolen = rivalRolls(armed, 6);
    expect(playerOf(stolen.state, "rival").position).toBe(20);
    expect(playerOf(stolen.state, "tenzai").position).toBe(16);
    expect(stolen.state.elementals.breezes).toEqual([]);
  });

  it("slips off a protected opponent and stays armed", () => {
    const armed = withPlayer(bend(placed(), { element: "wind" }).state, "rival", { spectralArmour: 2 });
    const { state, events } = rivalRolls(armed, 6);
    expect(playerOf(state, "rival").position).toBe(26);
    expect(state.elementals.breezes).toHaveLength(1);
    expect(eventsOfType(events, "breezeResisted")).toHaveLength(1);
  });

  it("is a secret only he knows about", () => {
    const { state, events } = bend(placed(), { element: "wind" });
    expect(projectState(state, "rival").elementals.breezes).toEqual([]);
    expect(projectState(state, "tenzai").elementals.breezes).toHaveLength(1);
    expect(eventsOfType(projectEvents(events, "rival"), "breezeArmed")).toEqual([]);
  });
});

describe("Primordial Awakening", () => {
  it("each new element joins the orbit; all four wake the Convergence", () => {
    const three = withTenzai(placed(), { orbit: ["earth", "water", "fire"], lastElement: "fire" });
    const { state, events } = bend(three, { element: "wind" });
    expect(playerOf(state, "tenzai")).toMatchObject({
      tenzai: { orbit: [], converged: CONVERGENCE_TURNS },
      abilityCharge: abilityCycle("fourElements"),
    });
    expect(playerOf(state, "tenzai").diceBonuses).toContainEqual({ amount: CONVERGENCE_BONUS, rolls: 1 });
    expect(eventsOfType(events, "convergenceAwakened")).toHaveLength(1);
  });

  it("makes him untouchable to the board's harm and to what others aim at him", () => {
    const converged = withTenzai(placed(), { converged: 2 });
    const { state } = rivalRolls(withPlayer(converged, "rival", { hand: [card("arcaneBlast")], energy: 10 }), 1);
    expect(playerOf(state, "tenzai").position).toBe(10);
    const blasted = play(
      onTurnOf(withPlayer(converged, "rival", { hand: [card("arcaneBlast")], energy: 10 }), "rival"),
      "rival",
      "test:arcaneBlast",
      { targetId: "tenzai" },
    );
    expect(eventsOfType(blasted.events, "cardBlocked")).toHaveLength(1);
  });
});

describe("Tenzai's cards", () => {
  it("Tectonic Fortification doubles his walls, or raises one ahead of the leader", () => {
    const fresh = play(withHand(placed(), "tectonicFortification"), "tenzai", "test:tectonicFortification");
    expect(fresh.state.elementals.walls).toEqual([
      { tile: 21, owner: "tenzai", hp: FORTIFY_NEW_HP, maxHp: FORTIFY_NEW_HP },
    ]);
    const walled = bend(placed(), { element: "earth", wallTile: 23 }).state;
    const doubled = play(withHand(walled, "tectonicFortification"), "tenzai", "test:tectonicFortification");
    expect(doubled.state.elementals.walls[0]).toMatchObject({ hp: WALL_HP * 2, maxHp: WALL_HP * 2 });
  });

  it("Riptide Lash swaps him with the bound target, or binds the nearest one ahead", () => {
    const bound = bend(placed(), { element: "water", targetId: "rival" }).state;
    const swapped = play(withHand(bound, "riptideLash"), "tenzai", "test:riptideLash");
    expect(playerOf(swapped.state, "tenzai").position).toBe(20);
    expect(playerOf(swapped.state, "rival").position).toBe(10);
    const quick = play(withHand(placed(), "riptideLash"), "tenzai", "test:riptideLash");
    expect(quick.state.elementals.tethers).toMatchObject([{ target: "rival", turnsLeft: 2 }]);
  });

  it("Forced Tailwind adds to the target's next roll", () => {
    const { state } = play(withHand(placed(), "forcedTailwind"), "tenzai", "test:forcedTailwind", {
      targetId: "rival",
    });
    expect(playerOf(state, "rival").diceBonuses).toContainEqual({ amount: FORCED_TAILWIND_BONUS, rolls: 1 });
  });

  it("the Elemental Exchange turns a creation into another element, doubled", () => {
    expectRuleError(
      () => play(withHand(placed(), "elementalExchange"), "tenzai", "test:elementalExchange", { element: "earth" }),
      "NO_CREATION",
    );
    const armed = bend(placed(), { element: "wind" }).state;
    const { state } = play(withHand(armed, "elementalExchange"), "tenzai", "test:elementalExchange", {
      element: "earth",
    });
    expect(state.elementals.breezes).toEqual([]);
    expect(state.elementals.walls).toEqual([{ tile: 21, owner: "tenzai", hp: WALL_HP * 2, maxHp: WALL_HP * 2 }]);
  });

  it("the Convergence of the Four bends everything at once and wakes the Convergence", () => {
    const { state } = play(withHand(placed(), "elementalConvergence"), "tenzai", "test:elementalConvergence");
    expect(state.elementals.walls).toHaveLength(1);
    expect(state.elementals.tethers).toHaveLength(1);
    expect(state.elementals.breezes).toHaveLength(1);
    expect(playerOf(state, "tenzai").tenzai).toMatchObject({ converged: CONVERGENCE_TURNS, orbit: [] });
    expect(playerOf(state, "tenzai").tenzai.combustion).not.toBeNull();
  });
});
