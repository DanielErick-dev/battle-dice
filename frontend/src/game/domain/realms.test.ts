import { describe, expect, it } from "vitest";
import { ARROW_RAIN_PUSH } from "./abilities";
import { createBoard, getTile, sameSpace, type BoardDefinition } from "./board";
import { DIVINE_CARDS } from "./cards";
import { GameRuleError } from "./commands";
import { TRACK_LENGTH } from "./realms";
import { activate, card, hasEvent, newGame, roll, withPlayer, withPlayers } from "./testing";
import type { GameState, TileEffect } from "./types";

const BOARD: BoardDefinition = {
  size: 30,
  effects: {
    5: { kind: "portal", to: 12, realm: "infernal" },
    15: { kind: "portal", to: 22, realm: "celestial" },
  },
};

const game = () => newGame(BOARD, { p1: null });

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

  it("lay out one hell for every portal into it: each player leaves where their own portal leads", () => {
    const twoGates: BoardDefinition = {
      size: 40,
      effects: {
        5: { kind: "portal", to: 12, realm: "infernal" },
        25: { kind: "portal", to: 33, realm: "infernal" },
      },
    };
    const shared = createBoard(twoGates);
    expect(shared.tracks).toHaveLength(1);
    expect(shared.tracks[0].entries).toEqual([
      { portal: 5, exit: 12 },
      { portal: 25, exit: 33 },
    ]);
    const [first] = shared.tracks[0].tiles;
    const last = shared.tracks[0].tiles.at(-1)!;

    // In by the second portal: onto the same first tile, and out at that portal's exit.
    const start = newGame(twoGates, { p1: null });
    const inHell = roll(withPlayer(start, "p1", { position: 24 }), "p1", 1).state;
    expect(inHell.players[0]).toMatchObject({
      position: first,
      realmEntry: { portal: 25, exit: 33 },
    });
    const out = roll(withPlayer(inHell, "p1", { position: last - 1 }), "p1", 2).state;
    expect(out.players[0].position).toBe(33);
  });

  it("lay out one heaven too: two players in by different portals walk the same corridor", () => {
    const twoGates: BoardDefinition = {
      size: 40,
      effects: {
        5: { kind: "portal", to: 12, realm: "celestial" },
        25: { kind: "portal", to: 33, realm: "celestial" },
      },
    };
    const shared = createBoard(twoGates);
    expect(shared.tracks).toHaveLength(1);
    expect(shared.tracks[0].entries).toEqual([
      { portal: 5, exit: 12 },
      { portal: 25, exit: 33 },
    ]);
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
    const { state, events } = roll(game(), "p1", 4);
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
    const onTrack = withPlayer(game(), "p1", { position: lastInfernal - 1 });
    const { state, events } = roll(onTrack, "p1", 3);
    expect(events).toContainEqual({
      type: "playerMoved",
      playerId: "p1",
      path: [lastInfernal, 12, 13],
    });
    expect(state.players[0].position).toBe(13);
  });

  it("bless on celestial tiles", () => {
    const blessing = celestial.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "blessing")!;
    const before = withPlayer(game(), "p1", {
      position: getTile(board, blessing).previous!,
      energy: 1,
    });
    const { events } = roll(before, "p1", 1);
    expect(hasEvent(events, "blessingReceived")).toBe(true);
  });

  it("curse on infernal tiles", () => {
    // Past the first tile, whose previous is the portal.
    const curse = infernal.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "curse")!;
    const before = withPlayer(game(), "p1", {
      position: getTile(board, curse).previous!,
      energy: 3,
    });
    const { events } = roll(before, "p1", 1);
    expect(hasEvent(events, "trapCursed")).toBe(true);
  });

  it("throw the player back along the infernal track", () => {
    const setback = infernal.tiles.slice(1).find((id) => getTile(board, id).effect.kind === "trap")!;
    const effect = getTile(board, setback).effect as Extract<TileEffect, { kind: "trap" }>;
    const { state } = roll(withPlayer(game(), "p1", { position: getTile(board, setback).previous! }), "p1", 1);
    expect(state.players[0].position).toBe(effect.to);
  });
});

describe("a realm track is cut off from the board", () => {
  const board = createBoard(BOARD);
  const inside = board.tracks[0].tiles[3];
  const duel = (archerAt: number, rivalAt: number, ability: "arrowRain" | "cardGamble" = "arrowRain") =>
    withPlayers(newGame(BOARD, { p1: ability, p2: null }), {
      p1: { position: archerAt, abilityCharge: 5 },
      p2: { position: rivalAt, hand: [card("windStep", "r")] },
    });

  it("knows which tiles share a place", () => {
    expect(sameSpace(board, 3, 20)).toBe(true);
    expect(sameSpace(board, 3, inside)).toBe(false);
    expect(sameSpace(board, inside, board.tracks[0].tiles[0])).toBe(true);
    expect(sameSpace(board, inside, board.tracks[1].tiles[0])).toBe(false);
  });

  it("Arrow Rain from the board can't be aimed at a player inside a realm, nor the other way round", () => {
    const aim = (state: GameState) => activate(state, "p1", { volley: "opponents" });
    expect(() => aim(duel(20, inside))).toThrow(GameRuleError);
    expect(() => aim(duel(inside, 20))).toThrow(GameRuleError);
    expect(aim(duel(25, 20)).state.players[1].position).toBe(20 - ARROW_RAIN_PUSH);
  });

  it("Card Gamble can't steal from a player in another place", () => {
    const { state } = activate(duel(20, inside, "cardGamble"), "p1", {}, [6]);
    expect(state.players[1].hand).toHaveLength(1);
  });

  it("Card Gamble may still bet against someone out of reach: a win is turned away, a loss costs a card", () => {
    const bet = (dice: number[]) => activate(duel(20, inside, "cardGamble"), "p1", { targetId: "p2" }, dice);
    const won = bet([5]);
    expect(won.events).toContainEqual(expect.objectContaining({ type: "abilityBlocked", ward: "away" }));
    expect(won.state.players[1].hand).toHaveLength(1);
    const lost = bet([1]);
    const hand = duel(20, inside, "cardGamble").players[0].hand.length;
    expect(lost.state.players[0].hand).toHaveLength(hand - 1);
    expect(lost.state.players[1].hand).toHaveLength(1);
  });

  it("with nobody in reach, Card Gamble's lucky throw draws as many cards as the die shows", () => {
    const start = duel(20, inside, "cardGamble");
    const lucky = (state: GameState) => activate(state, "p1", { power: "fortune" }, [2]);
    const hand = start.players[0].hand.length;
    expect(lucky(start).state.players[0].hand).toHaveLength(hand + 2);
    expect(() => lucky(duel(20, 25, "cardGamble"))).toThrow(GameRuleError);
  });
});
