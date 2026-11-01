import { describe, expect, it } from "vitest";
import { abilityCycle } from "../abilities/charge";
import { createBoard, type BoardDefinition } from "./board";
import { AEGIS_TURNS } from "../cards/play";
import { MAX_ENERGY } from "../core/energy";
import { standardDeck } from "../cards/decks";
import { BLESSING_TURNS, inHeaven, SPRING_ENERGY, WINGS_BONUS } from "./blessings";
import { card, newGame, play, roll, withPlayer } from "../testing";
import type { TimedBlessing } from "./types";
import type { Player } from "../core/state";

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
    // Heaven's track: its tiles come after the main path's.
    50: { kind: "portal", to: 55, realm: "celestial" },
  },
};
/** A tile in heaven: the celestial track's first. */
const HEAVEN = 61;

const game = () => newGame(BOARD, { p1: "studySession" });
const blessed = (kind: TimedBlessing, patch: Partial<Player> = {}) =>
  withPlayer(game(), "p1", { blessings: [{ kind, turnsLeft: BLESSING_TURNS, fresh: false }], ...patch });

describe("heaven's timed blessings", () => {
  it("land on whoever stops on their tile, for BLESSING_TURNS rounds", () => {
    const { state, events } = roll(withPlayer(game(), "p1", { position: 9 }), "p1", 1);
    // (Wherever it landed in heaven may have laid another blessing on top.)
    expect(state.players[0].blessings).toContainEqual({
      kind: "wings",
      turnsLeft: BLESSING_TURNS,
      fresh: false,
    });
    expect(events).toContainEqual({
      type: "blessingReceived",
      playerId: "p1",
      blessing: "wings",
      tile: 10,
      energyGained: 0,
    });
  });

  it(`wear off after ${BLESSING_TURNS} more rounds`, () => {
    let state = roll(withPlayer(game(), "p1", { position: 9 }), "p1", 1).state;
    for (let round = 1; round <= BLESSING_TURNS; round++) {
      expect(state.players[0].blessings, `round ${round}`).toHaveLength(1);
      state = roll(withPlayer(state, "p1", { position: 40 }), "p1", 1).state;
    }
    expect(state.players[0].blessings).toEqual([]);
  });

  it(`Wings add ${WINGS_BONUS} tiles to every roll`, () => {
    expect(roll(blessed("wings", { position: 40 }), "p1", 3).state.players[0].position).toBe(43 + WINGS_BONUS);
  });

  it("the Halo keeps traps and curses off", () => {
    const trapped = roll(blessed("halo", { position: 29 }), "p1", 1);
    expect(trapped.state.players[0].position).toBe(30);
    expect(trapped.events).toContainEqual({
      type: "trapBlocked",
      playerId: "p1",
      tile: 30,
      ward: "halo",
      hidden: false,
    });
    expect(roll(blessed("halo", { position: 31, energy: 4 }), "p1", 1).state.players[0].energy).toBe(4);
  });

  it("Inspiration charges the ability twice as fast", () => {
    const { state } = roll(blessed("inspiration", { position: 40, abilityCharge: 0 }), "p1", 1);
    expect(state.players[0].abilityCharge).toBe(2);
  });

  it(`the Spring of Light gives ${SPRING_ENERGY} energy as each turn starts`, () => {
    const start = blessed("spring", {
      position: 40,
      energy: 2,
      energyCharge: 0,
    });
    expect(roll(start, "p1", 1).state.players[0].energy).toBe(2 + SPRING_ENERGY);
  });

  it("stack: a second Spring adds its energy while both last, each wearing on its own", () => {
    const start = withPlayer(game(), "p1", {
      position: 40,
      energy: 0,
      energyCharge: 0,
      blessings: [
        { kind: "spring", turnsLeft: 1, fresh: false },
        { kind: "spring", turnsLeft: 3, fresh: false },
      ],
    });
    const first = roll(start, "p1", 1).state;
    expect(first.players[0].energy).toBe(SPRING_ENERGY);
    expect(first.players[0].blessings).toEqual([{ kind: "spring", turnsLeft: 2, fresh: false }]);
    expect(roll(withPlayer(first, "p1", { position: 40, energyCharge: 0 }), "p1", 1).state.players[0].energy).toBe(
      SPRING_ENERGY * 2,
    );
  });
});

describe("divine cards", () => {
  it("are found on their tile, that very card", () => {
    const { state } = roll(withPlayer(game(), "p1", { position: 19, hand: [] }), "p1", 1);
    expect(state.players[0].hand.map((card) => card.cardId)).toEqual(["celestialLight"]);
  });

  it("are never dealt in a deck", () => {
    expect(standardDeck({ withOpponents: true })).not.toContain("celestialLight");
  });

  const playing = (cardId: "celestialLight" | "heavenlyAegis" | "ascension", patch: Partial<Player> = {}) =>
    play(withPlayer(game(), "p1", { hand: [card(cardId, "d")], energy: 3, ...patch }), "p1", "d").state.players[0];

  it("Celestial Light fills the energy", () => {
    expect(playing("celestialLight").energy).toBe(MAX_ENERGY);
  });

  it("Heavenly Aegis raises a Spectral Armour", () => {
    expect(playing("heavenlyAegis").spectralArmour).toBe(AEGIS_TURNS);
  });

  it("Ascension readies the ability at once", () => {
    expect(playing("ascension", { abilityCharge: 0 }).abilityCharge).toBe(abilityCycle("studySession"));
  });

  it("wait in heaven, neither working nor wearing off, and start once the player is out", () => {
    const { state } = roll(blessed("wings", { position: HEAVEN }), "p1", 3);
    expect(state.players[0].position).toBe(HEAVEN + 3);
    // (Wherever it landed in heaven may have laid another blessing on top.)
    expect(state.players[0].blessings).toContainEqual({
      kind: "wings",
      turnsLeft: BLESSING_TURNS,
      fresh: false,
    });
    expect(inHeaven(createBoard(BOARD), HEAVEN)).toBe(true);
    expect(inHeaven(createBoard(BOARD), 40)).toBe(false);
  });
});
