import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalGameClient } from "@/game/application/localGameClient";
import { CLASSIC_BOARD } from "@/game/domain/board";
import { sequenceDice } from "@/game/domain/dice";
import { seededRandom } from "@/game/domain/random";
import { createGame } from "@/game/domain/engine";
import type { CardInstance, GameState } from "@/game/domain/types";
import { DEFAULT_TIMINGS } from "../config";
import { MatchStore } from "./matchStore";

const PLAYERS = [
  { id: "p1", name: "Goku" },
  { id: "p2", name: "Vegeta" },
];

function setup(rolls: number[], patch: (state: GameState) => GameState = (state) => state) {
  const client = new LocalGameClient(patch(createGame(CLASSIC_BOARD, PLAYERS)), {
    rollDice: sequenceDice(rolls),
    random: seededRandom(1),
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
    expect(store.getSnapshot().lastRoll).toEqual([3]);

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

  describe("cards", () => {
    const withP1 = (hand: CardInstance[], ki: number) => (state: GameState) => ({
      ...state,
      players: state.players.map((player) => (player.id === "p1" ? { ...player, hand, ki } : player)),
    });
    const barrier = { uid: "b", cardId: "kiBarrier" } as const;

    it("plays a card: pays ki, removes it from the hand and announces the cast", () => {
      const { store } = setup([1], withP1([barrier], 2));

      store.playCard("b");
      const view = store.getSnapshot();
      expect(view.cast).toMatchObject({ id: 1, playerId: "p1", card: barrier });
      expect(view.players[0].hand).toEqual([]);
      expect(view.players[0].ki).toBe(1);

      vi.runAllTimers();
      expect(store.getSnapshot().players[0].shielded).toBe(true);
      store.playCard("b");
      expect(store.getSnapshot().cardPlayedThisTurn).toBe(true);
    });

    it("waits for a discard when the hand overflows, then resumes", () => {
      const full: CardInstance[] = [
        { uid: "x", cardId: "senzuBean" },
        { uid: "y", cardId: "kaioken" },
        { uid: "z", cardId: "kiBarrier" },
      ];
      const onCardTile = (state: GameState) => ({
        ...withP1(full, 1)(state),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) => (tile.id === 2 ? { ...tile, effect: { kind: "card" as const } } : tile)),
        },
      });
      const { store } = setup([1], onCardTile);

      store.rollDice();
      vi.runAllTimers();
      const paused = store.getSnapshot();
      expect(paused.pendingDiscard?.playerId).toBe("p1");
      store.rollDice();
      expect(store.getSnapshot().isRolling).toBe(false);

      store.discardCard("y");
      vi.runAllTimers();
      const resumed = store.getSnapshot();
      expect(resumed.pendingDiscard).toBeNull();
      expect(resumed.players[0].hand.map(({ uid }) => uid)).toEqual(["x", "z", paused.pendingDiscard?.drawn.uid]);
      expect(resumed.activePlayerId).toBe("p2");
    });
  });
});
