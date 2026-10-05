import { describe, expect, it } from "vitest";
import { ARROW_RAIN_PUSH } from "./abilities";
import { createBoard, getTile, sameSpace, type BoardDefinition } from "./board";
import { sequenceDice } from "./dice";
import { GameRuleError } from "./commands";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import { TRACK_LENGTH } from "./realms";
import { DIVINE_CARDS } from "./cards";
import type { GameState, Player, TileEffect } from "./types";

const BOARD: BoardDefinition = {
  size: 30,
  effects: {
    5: { kind: "portal", to: 12, realm: "infernal" },
    15: { kind: "portal", to: 22, realm: "celestial" },
  },
};

const game = () => createGame(BOARD, [{ id: "p1", name: "Aria" }], { random: seededRandom(7) });

function withPlayer(state: GameState, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, ...patch })),
  };
}

const roll = (state: GameState, ...dice: number[]) =>
  applyCommand(state, { type: "rollDice", playerId: "p1" }, { rollDice: sequenceDice(dice), random: seededRandom(3) });

/** Tile effects that only hurt, and those that only help. */
const HARMFUL: ReadonlySet<TileEffect["kind"]> = new Set(["curse", "trap", "skipTurn"]);
const HELPFUL: ReadonlySet<TileEffect["kind"]> = new Set(["blessing", "card"]);

describe("realm tracks", () => {
  const board = createBoard(BOARD);
  const [infernal, celestial] = board.tracks;
  const lastInfernal = infernal.tiles.at(-1)!;

  it("add a track of tiles after the main path for each realm portal", () => {
    expect(board.tiles).toHaveLength(30 + TRACK_LENGTH * 2);
    expect(infernal).toMatchObject({ realm: "infernal", portal: 5, exit: 12 });
    expect(infernal.tiles).toEqual(Array.from({ length: TRACK_LENGTH }, (_, i) => 31 + i));
    expect(celestial).toMatchObject({
      realm: "celestial",
      portal: 15,
      exit: 22,
    });
    expect(getTile(board, lastInfernal).next).toBe(12);
    expect(getTile(board, 31).previous).toBe(5);
  });

  it("fill every infernal tile with something bad and every celestial tile with something good", () => {
    for (const id of infernal.tiles) expect(HARMFUL.has(getTile(board, id).effect.kind), `tile ${id}`).toBe(true);
    for (const id of celestial.tiles) expect(HELPFUL.has(getTile(board, id).effect.kind), `tile ${id}`).toBe(true);
  });

  it("keep setbacks inside their track", () => {
    for (const track of board.tracks) {
      track.tiles.forEach((id, index) => {
        const { effect } = getTile(board, id);
        if (effect.kind === "trap") expect(track.tiles.indexOf(effect.to)).toBeLessThan(index);
        if (effect.kind === "trap") expect(track.tiles).toContain(effect.to);
      });
    }
  });

  it("give in heaven only what can't be had elsewhere: timed blessings and divine cards", () => {
    for (const id of celestial.tiles) {
      const { effect } = getTile(board, id);
      if (effect.kind === "blessing") expect(["wings", "halo", "inspiration", "spring"]).toContain(effect.blessing);
      if (effect.kind === "card") expect(DIVINE_CARDS).toContain(effect.cardId);
    }
  });

  it("carry the player from the portal onto the track's first tile", () => {
    const { state, events } = roll(game(), 4);
    expect(events).toContainEqual({
      type: "realmEntered",
      playerId: "p1",
      realm: "infernal",
      from: 5,
      to: 31,
    });
    expect(state.players[0].position).toBe(31);
  });

  it("walk along the track and out at the exit", () => {
    const onTrack = withPlayer(game(), { position: lastInfernal - 1 });
    const { state, events } = roll(onTrack, 3);
    expect(events).toContainEqual({
      type: "playerMoved",
      playerId: "p1",
      path: [lastInfernal, 12, 13],
    });
    expect(state.players[0].position).toBe(13);
  });

  it("bless on celestial tiles", () => {
    const blessing = celestial.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "blessing")!;
    const before = withPlayer(game(), {
      position: getTile(board, blessing).previous!,
      energy: 1,
    });
    const { events } = roll(before, 1);
    expect(events.some((event) => event.type === "blessingReceived")).toBe(true);
  });

  it("curse on infernal tiles", () => {
    // Past the first tile, whose previous is the portal.
    const curse = infernal.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "curse")!;
    const before = withPlayer(game(), {
      position: getTile(board, curse).previous!,
      energy: 3,
    });
    const { events } = roll(before, 1);
    expect(events.some((event) => event.type === "trapCursed")).toBe(true);
  });

  it("throw the player back along the infernal track", () => {
    const setback = infernal.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "trap")!;
    const effect = getTile(board, setback).effect as Extract<TileEffect, { kind: "trap" }>;
    const { state } = roll(withPlayer(game(), { position: getTile(board, setback).previous! }), 1);
    expect(state.players[0].position).toBe(effect.to);
  });
});

describe("a realm track is cut off from the board", () => {
  const board = createBoard(BOARD);
  const inside = board.tracks[0].tiles[3];
  const duel = (archerAt: number, rivalAt: number, ability: "arrowRain" | "cardGamble" = "arrowRain") => {
    const state = createGame(
      BOARD,
      [
        { id: "p1", name: "Aria", ability },
        { id: "p2", name: "Bran" },
      ],
      { random: seededRandom(7) },
    );
    return {
      ...state,
      players: state.players.map((player) =>
        player.id === "p1"
          ? { ...player, position: archerAt, abilityCharge: 5 }
          : { ...player, position: rivalAt, hand: [{ uid: "r", cardId: "windStep" as const }] },
      ),
    };
  };
  const activate = (state: GameState, dice: number[] = [1]) =>
    applyCommand(
      state,
      { type: "activateAbility", playerId: "p1" },
      { rollDice: sequenceDice(dice), random: seededRandom(3) },
    );

  it("knows which tiles share a place", () => {
    expect(sameSpace(board, 3, 20)).toBe(true);
    expect(sameSpace(board, 3, inside)).toBe(false);
    expect(sameSpace(board, inside, board.tracks[0].tiles[0])).toBe(true);
    expect(sameSpace(board, inside, board.tracks[1].tiles[0])).toBe(false);
  });

  it("Arrow Rain from the board can't be aimed at a player inside a realm, nor the other way round", () => {
    const aim = (state: GameState) =>
      applyCommand(
        state,
        { type: "activateAbility", playerId: "p1", volley: "opponents" },
        { rollDice: sequenceDice([1]), random: seededRandom(3) },
      );
    expect(() => aim(duel(20, inside))).toThrow(GameRuleError);
    expect(() => aim(duel(inside, 20))).toThrow(GameRuleError);
    expect(aim(duel(25, 20)).state.players[1].position).toBe(20 - ARROW_RAIN_PUSH);
  });

  it("Card Gamble can't steal from a player in another place", () => {
    const { state } = activate(duel(20, inside, "cardGamble"), [6]);
    expect(state.players[1].hand).toHaveLength(1);
  });
});
