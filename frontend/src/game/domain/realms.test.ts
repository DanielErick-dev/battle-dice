import { describe, expect, it } from "vitest";
import { createBoard, getTile, type BoardDefinition } from "./board";
import { sequenceDice } from "./dice";
import { applyCommand, createGame } from "./engine";
import { seededRandom } from "./random";
import { TRACK_LENGTH } from "./realms";
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
const HELPFUL: ReadonlySet<TileEffect["kind"]> = new Set(["blessing", "card", "extraTurn", "advance"]);

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

  it("keep setbacks and rushes inside their track", () => {
    for (const track of board.tracks) {
      track.tiles.forEach((id, index) => {
        const { effect } = getTile(board, id);
        if (effect.kind === "trap") expect(track.tiles.indexOf(effect.to)).toBeLessThan(index);
        if (effect.kind === "advance") expect(track.tiles.indexOf(effect.to)).toBeGreaterThan(index);
        if (effect.kind === "trap" || effect.kind === "advance") expect(track.tiles).toContain(effect.to);
      });
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
