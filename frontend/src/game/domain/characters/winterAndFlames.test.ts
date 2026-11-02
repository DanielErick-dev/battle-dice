import { describe, expect, it } from "vitest";
import {
  ARMOUR_TURNS,
  FLAME_TILES,
  FLAME_ENERGY,
  FLAME_PUSH,
  FLAME_HITS,
  FLAME_TURNS,
  SUSANOO_PUSH,
  flammableTiles,
} from "./kage/flames";
import { ENCHANT_ADVANCE, ENCHANT_FREEZE, WINTER_PICKS, WINTER_TILES, frozenTiles } from "./fairy/winter";
import { abilityCycle } from "../abilities/charge";
import type { AbilityId } from "../abilities/ability";
import { GameRuleError } from "../core/errors";
import { HARM_AHEAD_BOARD } from "../testing/boards";
import {
  activate as activateFor,
  type ActivateOptions,
  card,
  eventsOfType,
  hasEvent,
  newGame,
  onTurnOf,
  play,
  playerOf,
  readyAbility,
  roll,
  withPlayer,
} from "../testing";
import type { GameState, Player } from "../core/state";

const duel = (ability: AbilityId) => newGame(HARM_AHEAD_BOARD, { hero: ability, rival: "studySession" });
const ready = (state: GameState) => readyAbility(state, "hero");
const activate = (state: GameState, options: ActivateOptions = {}) => activateFor(state, "hero", options);
/** The rival's turn, standing on `from`, rolling `die`. */
const rivalRolls = (state: GameState, from: number, die: number) =>
  roll(onTurnOf(withPlayer(state, "rival", { position: from }), "rival"), "rival", die);

describe("Fairy Bloom", () => {
  const bloomed = () => activate(ready(withPlayer(duel("fairyBloom"), "hero", { position: 10 }))).state;

  it("an opponent stuck in the snow feeds the fairy a point of energy each round, gripped less each time", () => {
    const start = withPlayer(withPlayer(bloomed(), "rival", { energy: 5 }), "hero", {
      energy: 2,
    });
    let state = rivalRolls(start, 9, 3).state;
    expect(playerOf(state, "rival").snowbound).toEqual({
      owner: "hero",
      rounds: ENCHANT_FREEZE,
    });
    state = roll(state, "hero").state;
    expect(playerOf(state, "rival")).toMatchObject({
      energy: 4,
      snowbound: { owner: "hero", rounds: 1 },
    });
    expect(playerOf(state, "hero").energy).toBeGreaterThanOrEqual(3);
    state = roll(state, "hero").state;
    expect(playerOf(state, "rival")).toMatchObject({
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
    const start = withPlayer(withPlayer(bloomed(), "rival", { energy: 5 }), "hero", { abilityCharge: 0 });
    const { state, events } = rivalRolls(start, 9, 3);
    expect(playerOf(state, "rival")).toMatchObject({ position: 12, energy: 5, skipTurns: ENCHANT_FREEZE });
    expect(hasEvent(events, "trapTriggered")).toBe(false);
    expect(playerOf(state, "hero").abilityCharge).toBeGreaterThanOrEqual(1);
  });

  it("the fairy walking over her own snow isn't carried: only stopping on it counts", () => {
    // Snow at 12, 15 and 20: from 10 a 4 crosses 12 and stops on 14, and stays there.
    const start = onTurnOf(withPlayer(bloomed(), "hero", { position: 10, abilityCharge: 0 }), "hero");
    const { state, events } = roll(start, "hero", 4);
    expect(playerOf(state, "hero").position).toBe(14);
    expect(hasEvent(events, "enchantmentStirred")).toBe(false);
  });

  it("the fairy stopping on her own is carried ahead, and on again only when that stops on more snow", () => {
    // Snow at 12, 17 and 22: stops on 12, carried to 17 (snow), 22 (snow), then 27.
    const snowy = {
      ...bloomed(),
      enchantedTiles: [12, 17, 22].map((tile) => ({ tile, owner: "hero" })),
    };
    const start = onTurnOf(withPlayer(snowy, "hero", { position: 9, abilityCharge: 0 }), "hero");
    const { state, events } = roll(start, "hero", 3);
    expect(playerOf(state, "hero").position).toBe(27);
    expect(eventsOfType(events, "enchantmentStirred")).toHaveLength(3);
    // Carried onto the trap at 20 (snow only at 12 and 15): nothing happens there.
    const trapped = {
      ...bloomed(),
      enchantedTiles: [{ tile: 15, owner: "hero" }],
    };
    const onTrap = roll(onTurnOf(withPlayer(trapped, "hero", { position: 13 }), "hero"), "hero", 2);
    expect(playerOf(onTrap.state, "hero").position).toBe(20);
  });
});

describe("Fairy snow against an Arcane Shield", () => {
  it("is kept off by the shield, which is spent; the snow stays", () => {
    const snowy = { ...duel("fairyBloom"), enchantedTiles: [{ tile: 12, owner: "hero" }] };
    const { state, events } = rivalRolls(withPlayer(snowy, "rival", { shielded: true }), 10, 2);
    expect(playerOf(state, "rival")).toMatchObject({ position: 12, shielded: false, snowbound: null, skipTurns: 0 });
    expect(eventsOfType(events, "trapBlocked")).toHaveLength(1);
    expect(state.enchantedTiles).toEqual([{ tile: 12, owner: "hero" }]);
  });
});

describe("Ocular Awakening", () => {
  const kunoichi = () => ready(withPlayer(duel("ocularAwakening"), "hero", { position: 20 }));

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
    const through = rivalRolls(withPlayer(lit, "rival", { energy: 5 }), 22, 3).state;
    expect(playerOf(through, "rival")).toMatchObject({ energy: 5, position: 25 });
    const { state } = rivalRolls(withPlayer(lit, "rival", { energy: 5 }), 22, 2);
    expect(playerOf(state, "rival").energy).toBe(5 - FLAME_ENERGY);
    expect(playerOf(state, "rival").position).toBe(24 - FLAME_PUSH);
  });

  it("never burns Kage Rubra herself, whoever holds the fire", () => {
    const zareks = { ...duel("ocularAwakening"), blackFlames: [{ tile: 24, owner: "rival", turnsLeft: 3, hits: 0 }] };
    const { state, events } = roll(withPlayer(zareks, "hero", { position: 22, energy: 5 }), "hero", 2);
    expect(playerOf(state, "hero")).toMatchObject({ energy: 5, position: 24 });
    expect(eventsOfType(events, "flamesScorched")).toEqual([]);
  });

  it("every scorch charges her ability by a turn", () => {
    const lit = withPlayer(activate(kunoichi(), { power: "flames", flameTiles: [24] }).state, "hero", {
      abilityCharge: 0,
    });
    const { events } = rivalRolls(lit, 22, 2);
    expect(events).toContainEqual(expect.objectContaining({ type: "flamesScorched", charged: true }));
  });

  it("black fire smothers the tile: whatever it held does nothing while it burns", () => {
    const lit = activate(kunoichi(), { power: "flames", flameTiles: [30] }).state;
    const { state, events } = rivalRolls(withPlayer(lit, "rival", { energy: 5 }), 28, 2);
    expect(hasEvent(events, "extraTurnGranted")).toBe(false);
    expect(playerOf(state, "rival").position).toBe(30 - FLAME_PUSH);
    // The Kunoichi on her own fire: nothing at all, not even the tile's extra turn.
    const own = roll(onTurnOf(withPlayer(lit, "hero", { position: 28 }), "hero"), "hero", 2);
    expect(playerOf(own.state, "hero").position).toBe(30);
    expect(hasEvent(own.events, "extraTurnGranted")).toBe(false);
  });

  it("can set her own tile alight", () => {
    expect(activate(kunoichi(), { power: "flames", flameTiles: [20] }).state.blackFlames).toHaveLength(1);
  });

  it("the Crimson Witch stands in black fire and on the fairy's frost unharmed", () => {
    const witch = (state: GameState) => withPlayer(state, "rival", { ability: "levitation", energy: 5 });
    const lit = activate(kunoichi(), { power: "flames", flameTiles: [24] }).state;
    expect(playerOf(rivalRolls(witch(lit), 22, 2).state, "rival")).toMatchObject({ energy: 5, position: 24 });
    const bloomed = activate(ready(withPlayer(duel("fairyBloom"), "hero", { position: 10 }))).state;
    expect(playerOf(rivalRolls(witch(bloomed), 9, 3).state, "rival")).toMatchObject({ energy: 5, position: 12 });
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

  it("Her Susanoo turns away what others aim at her", () => {
    const armoured = activate(kunoichi(), { power: "armour" }).state;
    expect(playerOf(armoured, "hero").spectralArmour).toBe(ARMOUR_TURNS);
    const rivalTurn = onTurnOf(
      withPlayer(armoured, "rival", { position: 20, hand: [card("arcaneBlast", "b")], energy: 5 }),
      "rival",
    );
    const { state, events } = play(rivalTurn, "rival", "b", { targetId: "hero" });
    expect(events).toContainEqual(expect.objectContaining({ type: "cardBlocked", ward: "susanoo" }));
    expect(playerOf(state, "hero").position).toBe(playerOf(armoured, "hero").position);
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
    expect(playerOf(state, "rival").position).toBe(20 - SUSANOO_PUSH);
    // Walking past her is fine, and without her armour her tile is anyone's.
    expect(playerOf(rivalRolls(armoured, 17, 4).state, "rival").position).toBe(21);
    const bare = withPlayer(armoured, "hero", { spectralArmour: 0 });
    expect(hasEvent(rivalRolls(bare, 17, 3).events, "susanooRepelled")).toBe(false);
  });

  it(`Inside her Susanoo she sweeps those on the tile she stops on ${SUSANOO_PUSH} ahead`, () => {
    const armoured = withPlayer(activate(kunoichi(), { power: "armour" }).state, "rival", { position: 23 });
    const { state, events } = roll(armoured, "hero", 3);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "susanooRepelled",
        playerId: "rival",
        tile: 23,
        to: 23 + SUSANOO_PUSH,
        ahead: true,
      }),
    );
    expect(playerOf(state, "rival").position).toBe(23 + SUSANOO_PUSH);
    expect(playerOf(state, "hero").position).toBe(23);
  });
});

describe("Kage Rubra's Susanoo", () => {
  /** One step before the trap at 12, with `patch`. */
  const kage = (patch: Partial<Player>) => withPlayer(duel("ocularAwakening"), "hero", { position: 11, ...patch });

  it("keeps the board's traps off her", () => {
    expect(playerOf(roll(kage({ spectralArmour: 2 }), "hero", 1).state, "hero").position).toBe(12);
    expect(playerOf(roll(kage({}), "hero", 1).state, "hero").position).toBe(8);
  });

  it("can't stop a hidden trap's spike from below", () => {
    const hidden = { ...kage({ spectralArmour: 2 }), hiddenTraps: [12] };
    const { events } = roll(hidden, "hero", 1);
    expect(hasEvent(events, "trapBlocked")).toBe(false);
  });
});

describe("Eternal Winter", () => {
  const bloomed = () => activate(ready(withPlayer(duel("fairyBloom"), "hero", { position: 10 })));
  const winter = (state: GameState, frontier: number) => ({
    ...state,
    winter: { owner: "hero", frontier, iced: [] },
  });

  it("sets in once no harm is left ahead of the fairy", () => {
    const { state, events } = bloomed();
    expect(state.winter).toEqual({
      owner: "hero",
      frontier: state.board.startTile,
      iced: [],
    });
    expect(events).toContainEqual({ type: "winterBegan", playerId: "hero" });
  });

  it("waits while there's still harm ahead to snow", () => {
    // A hidden trap further on is still left once her three tiles are snowed.
    const hidden = {
      ...withPlayer(duel("fairyBloom"), "hero", { position: 10 }),
      hiddenTraps: [40],
    };
    const { state } = activate(ready(hidden));
    expect(state.winter).toBeNull();
  });

  it("freezes WINTER_TILES more tiles every round", () => {
    const afterHero = roll(bloomed().state, "hero", 1).state;
    expect(afterHero.winter?.frontier).toBe(afterHero.board.startTile);
    const { state, events } = roll(withPlayer(afterHero, "rival", { position: 40 }), "rival", 1);
    const start = state.board.startTile;
    expect(state.winter?.frontier).toBe(start + WINTER_TILES);
    expect(events).toContainEqual({
      type: "winterSpread",
      owner: "hero",
      from: start + 1,
      to: start + WINTER_TILES,
    });
  });

  it("the ice is her snow: an opponent is stuck in it and charges her, the fairy is carried on from ice to ice", () => {
    const frozen = winter(duel("fairyBloom"), 40);
    const rival = rivalRolls(frozen, 3, 2);
    expect(playerOf(rival.state, "rival")).toMatchObject({
      skipTurns: ENCHANT_FREEZE,
      snowbound: { owner: "hero" },
    });
    expect(rival.events).toContainEqual(expect.objectContaining({ type: "enchantmentStirred", charged: true }));
    const hero = roll(withPlayer(frozen, "hero", { position: 3 }), "hero", 2).state;
    expect(playerOf(hero, "hero")).toMatchObject({ position: 40 + ENCHANT_ADVANCE, skipTurns: 0 });
  });

  it(`in winter her ability freezes ${WINTER_PICKS} tile of her choice, and it holds like the rest of the ice`, () => {
    const frozen = ready(withPlayer(winter(duel("fairyBloom"), 4), "hero", { position: 10 }));
    const { state, events } = activateFor(frozen, "hero", { frostTiles: [30] });
    expect(state.winter?.iced).toEqual([30]);
    expect(events).toContainEqual({ type: "tilesFrozen", playerId: "hero", tiles: [30] });
    expect(state.enchantedTiles).toEqual(frozen.enchantedTiles);
    expect(playerOf(rivalRolls(state, 28, 2).state, "rival")).toMatchObject({ skipTurns: ENCHANT_FREEZE });
    expect(playerOf(roll(withPlayer(state, "hero", { position: 28 }), "hero", 2).state, "hero").position).toBe(
      30 + ENCHANT_ADVANCE,
    );
  });

  it("winter beats fire: she may freeze a burning tile, putting it out, and the ice can't be set alight", () => {
    const burning = {
      ...winter(duel("fairyBloom"), 4),
      blackFlames: [{ tile: 30, owner: "rival", turnsLeft: 5, hits: 0 }],
    };
    const { state } = activateFor(ready(withPlayer(burning, "hero", { position: 10 })), "hero", { frostTiles: [30] });
    expect(state.blackFlames).toEqual([]);
    expect(playerOf(rivalRolls(state, 28, 2).state, "rival")).toMatchObject({ skipTurns: ENCHANT_FREEZE });
    expect(flammableTiles(state.board, 10, frozenTiles(state.winter, state.board.startTile))).not.toContain(30);
  });

  it("an extra turn still owed is spent as the first round stuck in the ice, feeding the fairy", () => {
    const frozen = { ...withPlayer(winter(duel("fairyBloom"), 40), "rival", { energy: 5 }), bonusTurn: true };
    const { state, events } = rivalRolls(frozen, 3, 2);
    expect(events).toContainEqual({ type: "snowDrained", playerId: "rival", owner: "hero", energy: 1 });
    expect(playerOf(state, "rival")).toMatchObject({ energy: 4, skipTurns: ENCHANT_FREEZE - 1 });
    expect(state.players[state.currentPlayerIndex].id).toBe("hero");
  });

  it("can't freeze more than its share, twice the same tile, or tiles already frozen", () => {
    const frozen = ready(withPlayer(winter(duel("fairyBloom"), 4), "hero", { position: 10 }));
    for (const frostTiles of [[30, 31], [30, 30], [3], []]) {
      expect(() => activateFor(frozen, "hero", { frostTiles }), `${frostTiles}`).toThrow(GameRuleError);
    }
  });

  it("the ice reaching her picks takes them in", () => {
    const iced = { ...winter(duel("fairyBloom"), 1), winter: { owner: "hero", frontier: 1, iced: [3, 40] } };
    const { state } = rivalRolls(iced, 30, 1);
    expect(state.winter).toMatchObject({ frontier: 1 + WINTER_TILES, iced: [40] });
  });
});
