import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalGameClient } from "@/game/application/localGameClient";
import { CLASSIC_BOARD } from "@/game/domain/board";
import { sequenceDice } from "@/game/domain/dice";
import { createGame } from "@/game/domain/engine";
import { DEFAULT_TIMINGS } from "../config";
import { MatchStore } from "./matchStore";

const PLAYERS = [
  { id: "p1", name: "Goku" },
  { id: "p2", name: "Vegeta" },
];

function setup(rolls: number[]) {
  const client = new LocalGameClient(createGame(CLASSIC_BOARD, PLAYERS), {
    rollDice: sequenceDice(rolls),
  });
  const store = new MatchStore(client);
  const disconnect = store.connect();
  return { store, disconnect };
}

const positionOf = (store: MatchStore, id: string) =>
  store.getSnapshot().players.find((p) => p.id === id)?.position;

describe("MatchStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("replays movement one tile at a time", () => {
    const { store } = setup([3]);

    store.rollDice();
    expect(store.getSnapshot().isRolling).toBe(true);
    expect(positionOf(store, "p1")).toBe(1);

    vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRollMs);
    expect(store.getSnapshot().lastRoll).toBe(3);

    vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRevealMs);
    expect(positionOf(store, "p1")).toBe(2);

    vi.runAllTimers();
    expect(positionOf(store, "p1")).toBe(4);
    expect(store.getSnapshot().activePlayerId).toBe("p2");
    expect(store.getSnapshot().isAnimating).toBe(false);
  });

  it("ignores rolls while an animation is playing", () => {
    const { store } = setup([3, 6]);

    store.rollDice();
    store.rollDice();
    vi.runAllTimers();

    expect(positionOf(store, "p1")).toBe(4);
    expect(positionOf(store, "p2")).toBe(1);
  });

  it("exposes the portal effect before teleporting", () => {
    const { store } = setup([4]);

    store.rollDice();
    vi.advanceTimersByTime(
      DEFAULT_TIMINGS.diceRollMs + DEFAULT_TIMINGS.diceRevealMs + 4 * DEFAULT_TIMINGS.stepMs,
    );
    expect(store.getSnapshot().effect).toMatchObject({ kind: "portal", from: 5, to: 10 });
    expect(positionOf(store, "p1")).toBe(5);

    vi.runAllTimers();
    expect(positionOf(store, "p1")).toBe(10);
  });

  it("stops playback on disconnect", () => {
    const { store, disconnect } = setup([3]);

    store.rollDice();
    disconnect();
    vi.runAllTimers();

    expect(positionOf(store, "p1")).toBe(1);
  });
});
