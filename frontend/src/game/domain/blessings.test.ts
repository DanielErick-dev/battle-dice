import { describe, expect, it } from "vitest";
import { abilityCycle } from "./abilities";
import type { BoardDefinition } from "./board";
import { AEGIS_TURNS, MAX_ENERGY, standardDeck } from "./cards";
import { BLESSING_TURNS, SPRING_ENERGY, WINGS_BONUS } from "./blessings";
import type { GameCommand } from "./commands";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import type { GameState, Player, TimedBlessing } from "./types";

/** A blessing of each kind at 10–13, a relic of each divine card at 20–22, a trap at 30, a curse at 32. */
const BOARD: BoardDefinition = {
  size: 60,
  effects: {
    10: { kind: "blessing", blessing: "wings" },
    11: { kind: "blessing", blessing: "halo" },
    12: { kind: "blessing", blessing: "inspiration" },
    13: { kind: "blessing", blessing: "spring" },
    20: { kind: "card", cardId: "celestialLight" },
    21: { kind: "card", cardId: "heavenlyAegis" },
    22: { kind: "card", cardId: "ascension" },
    30: { kind: "trap", to: 25 },
    32: { kind: "curse", curse: "drain" },
  },
};

const game = () =>
  createGame(BOARD, [{ id: "p1", name: "Aria", ability: "studySession" }], { random: seededRandom(7) });
const withPlayer = (state: GameState, patch: Partial<Player>): GameState => ({
  ...state,
  players: state.players.map((player) => ({ ...player, ...patch })),
});
const send = (state: GameState, command: GameCommand, dice: number[] = [1]) =>
  applyCommand(state, command, { rollDice: sequenceDice(dice), random: seededRandom(3) });
const roll = (state: GameState, die: number) => send(state, { type: "rollDice", playerId: "p1" }, [die]);
const blessed = (kind: TimedBlessing, patch: Partial<Player> = {}) =>
  withPlayer(game(), { blessings: [{ kind, turnsLeft: BLESSING_TURNS, fresh: false }], ...patch });

describe("heaven's timed blessings", () => {
  it("land on whoever stops on their tile, for BLESSING_TURNS rounds", () => {
    const { state, events } = roll(withPlayer(game(), { position: 9 }), 1);
    expect(state.players[0].blessings).toEqual([{ kind: "wings", turnsLeft: BLESSING_TURNS, fresh: false }]);
    expect(events).toContainEqual({
      type: "blessingReceived",
      playerId: "p1",
      blessing: "wings",
      tile: 10,
      energyGained: 0,
    });
  });

  it(`wear off after ${BLESSING_TURNS} more rounds`, () => {
    let state = roll(withPlayer(game(), { position: 9 }), 1).state;
    for (let round = 1; round <= BLESSING_TURNS; round++) {
      expect(state.players[0].blessings, `round ${round}`).toHaveLength(1);
      state = roll(withPlayer(state, { position: 40 }), 1).state;
    }
    expect(state.players[0].blessings).toEqual([]);
  });

  it(`Wings add ${WINGS_BONUS} tiles to every roll`, () => {
    expect(roll(blessed("wings", { position: 40 }), 3).state.players[0].position).toBe(43 + WINGS_BONUS);
  });

  it("the Halo keeps traps and curses off", () => {
    const trapped = roll(blessed("halo", { position: 29 }), 1);
    expect(trapped.state.players[0].position).toBe(30);
    expect(trapped.events).toContainEqual({
      type: "trapBlocked",
      playerId: "p1",
      tile: 30,
      ward: "halo",
      hidden: false,
    });
    expect(roll(blessed("halo", { position: 31, energy: 4 }), 1).state.players[0].energy).toBe(5);
  });

  it("Inspiration charges the ability twice as fast", () => {
    const { state } = roll(blessed("inspiration", { position: 40, abilityCharge: 0 }), 1);
    expect(state.players[0].abilityCharge).toBe(2);
  });

  it(`the Spring of Light gives ${SPRING_ENERGY} energy as each turn starts`, () => {
    const start = blessed("spring", { position: 40, energy: 2, energyCharge: 0 });
    expect(roll(start, 1).state.players[0].energy).toBe(2 + SPRING_ENERGY + 1); // + their turn's energy
  });
});

describe("divine cards", () => {
  it("are found on their tile, that very card", () => {
    const { state } = roll(withPlayer(game(), { position: 19, hand: [] }), 1);
    expect(state.players[0].hand.map((card) => card.cardId)).toEqual(["celestialLight"]);
  });

  it("are never dealt in a deck", () => {
    expect(standardDeck({ withOpponents: true })).not.toContain("celestialLight");
  });

  const playing = (cardId: "celestialLight" | "heavenlyAegis" | "ascension", patch: Partial<Player> = {}) =>
    send(withPlayer(game(), { hand: [{ uid: "d", cardId }], energy: 3, ...patch }), {
      type: "playCard",
      playerId: "p1",
      cardUid: "d",
    }).state.players[0];

  it("Celestial Light fills the energy", () => {
    expect(playing("celestialLight").energy).toBe(MAX_ENERGY);
  });

  it("Heavenly Aegis raises a Spectral Armour", () => {
    expect(playing("heavenlyAegis").spectralArmour).toBe(AEGIS_TURNS);
  });

  it("Ascension readies the ability at once", () => {
    expect(playing("ascension", { abilityCharge: 0 }).abilityCharge).toBe(abilityCycle("studySession"));
  });
});
